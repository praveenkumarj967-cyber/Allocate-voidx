import { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, Bot, Calendar, Clock, CheckCircle2, Loader2, Mic, MicOff, BarChart3, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { addHours, format, parse, isFuture, startOfHour } from "date-fns";
import { notifyAdmins } from "@/lib/notifications";
import { useNavigate } from "@tanstack/react-router";
import { calculateDynamicPriority } from "@/lib/priority-engine";

type Message = {
  role: "bot" | "user";
  text: string;
  type?: "text" | "action" | "success";
};

type ChatState = "idle" | "searching" | "picking_time" | "confirming";

export function ChatAssistant() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", text: `Hi! I'm your ${isAdmin ? "System" : "Booking"} Assistant. ${isAdmin ? "How can I help you manage the platform today?" : "What would you like to book today?"}` }
  ]);
  const [input, setInput] = useState("");
  const [state, setState] = useState<ChatState>("idle");
  const [adminState, setAdminState] = useState<"idle" | "creating_category" | "adding_resource">("idle");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  // Admin Selection Context
  const [newCategory, setNewCategory] = useState({ name: "", icon: "box" });
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [duration, setDuration] = useState(1);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const addMessage = (role: Message["role"], text: string, type: Message["type"] = "text") => {
    setMessages(prev => [...prev, { role, text, type }]);
  };

  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      // Automatically send if it's a clear command
      setTimeout(() => handleSend(transcript), 500);
    };

    recognition.start();
  };

  const handleSend = async (overrideInput?: string) => {
    const userText = (overrideInput || input.trim()).toLowerCase();
    if (!userText || loading) return;
    
    setInput("");
    addMessage("user", userText);
    setLoading(true);

    try {
      // --- 1. NAVIGATION COMMANDS ---
      if (userText.includes("go to") || userText.includes("show") || userText.includes("take me to")) {
        if (userText.includes("admin")) { navigate({ to: "/admin" }); addMessage("bot", "Transporting you to the Admin Panel..."); }
        else if (userText.includes("booking")) { navigate({ to: "/app/bookings" }); addMessage("bot", "Opening your schedule..."); }
        else if (userText.includes("resource")) { navigate({ to: "/app/resources" }); addMessage("bot", "Opening the catalog..."); }
        else if (userText.includes("overview")) { navigate({ to: "/app" }); addMessage("bot", "Heading back to the dashboard."); }
        setLoading(false);
        return;
      }

      // --- 2. ANALYTICS COMMANDS (Admin) ---
      if (isAdmin && (userText.includes("how many") || userText.includes("stat") || userText.includes("busiest"))) {
        const { count: bCount } = await supabase.from("bookings").select("id", { count: "exact", head: true });
        const { count: uCount } = await supabase.from("user_roles").select("id", { count: "exact", head: true });
        
        if (userText.includes("booking")) {
          addMessage("bot", `We have ${bCount} total bookings in the system right now.`);
        } else if (userText.includes("user")) {
          addMessage("bot", `There are currently ${uCount} registered members.`);
        } else {
          addMessage("bot", "The system is running smoothly. Would you like a full report on the Analytics page?");
        }
        setLoading(false);
        return;
      }

      // --- 3. INFORMATION QUERIES ---
      if (userText.includes("where is") || userText.includes("location of")) {
        const query = userText.replace("where is", "").replace("location of", "").trim();
        const { data } = await supabase.from("resources").select("name, location").ilike("name", `%${query}%`).limit(1);
        
        if (data && data[0]) {
          addMessage("bot", `The ${data[0].name} is located at: ${data[0].location || "the main facility"}.`);
        } else {
          addMessage("bot", "I'm not sure where that is. Try checking the Resources page.");
        }
        setLoading(false);
        return;
      }

      // --- 4. ADMIN WORKFLOWS ---
      if (isAdmin) {
        if (adminState === "idle" && (userText.includes("create category") || userText.includes("add category"))) {
          const name = userText.replace("create category", "").replace("add category", "").trim();
          if (name) {
            setNewCategory({ name, icon: "package" });
            addMessage("bot", `I'll create the "${name}" category. What icon should I use? (laptop, car, building, camera, etc.)`);
            setAdminState("creating_category");
            setLoading(false);
            return;
          } else {
            addMessage("bot", "Sure! What should we name the new category?");
            setAdminState("creating_category");
            setLoading(false);
            return;
          }
        }

        if (adminState === "creating_category") {
          const name = newCategory.name || userText;
          const icon = newCategory.name ? userText : "package";
          
          const { error } = await supabase.from("resource_categories").insert({ name, icon });
          if (error) {
            addMessage("bot", `Failed to create category: ${error.message}`);
          } else {
            addMessage("bot", `Success! The "${name}" category has been created.`, "success");
            toast.success("Category created via Assistant");
          }
          setAdminState("idle");
          setLoading(false);
          return;
        }
      }

      // --- 5. USER WORKFLOWS (Booking) ---
      if (state === "idle") {
        const fillerWords = ["i", "want", "to", "book", "a", "an", "the", "need", "can", "have", "please", "looking", "for"];
        const keywords = userText.split(" ").filter(word => !fillerWords.includes(word) && word.length > 2);
        const searchTerms = keywords.length > 0 ? keywords : [userText];
        
        const { data: resources } = await supabase
          .from("resources")
          .select("*, resource_categories(name)")
          .or(`name.ilike.%${searchTerms[0]}%,description.ilike.%${searchTerms[0]}%`)
          .eq("status", "active")
          .limit(1);

        if (resources && resources.length > 0) {
          const res = resources[0];
          setSelectedResource(res);
          addMessage("bot", `I found the "${res.name}". Is this what you're looking for? If so, when would you like to start? (e.g., Today at 3 PM)`);
          setState("picking_time");
        } else {
          addMessage("bot", `I couldn't quite find "${userText}". Try just typing the name, like "Tesla" or "Scanner".`);
        }
        setLoading(false);
        return;
      } 
      
      if (state === "picking_time") {
        let date = new Date();
        if (userText.includes("tomorrow")) date.setDate(date.getDate() + 1);
        date = startOfHour(addHours(date, 1));
        setStartTime(date);
        addMessage("bot", `Got it: ${format(date, "MMM do 'at' h:mm a")}. For how many hours do you need it?`);
        setState("confirming");
      }
      else if (state === "confirming") {
        const hours = parseInt(userText) || 1;
        setDuration(hours);
        const endTime = addHours(startTime!, hours);
        addMessage("bot", `Perfect. I'll book ${selectedResource.name} from ${format(startTime!, "h:mm a")} to ${format(endTime, "h:mm a")}. Shall I proceed?`, "action");
      }
    } catch (err) {
      addMessage("bot", "Sorry, I ran into an error. Let's start over.");
      reset();
    } finally {
      setLoading(false);
    }
  };

  const executeBooking = async () => {
    if (!selectedResource || !startTime || !user) return;
    setLoading(true);

    const endTime = addHours(startTime, duration);

    const aiPriority = await calculateDynamicPriority({
      purpose: "Booked via Assistant",
      startTime,
      userId: user.id,
      resourceId: selectedResource.id,
    });

    const { error } = await supabase.from("bookings").insert({
      resource_id: selectedResource.id,
      user_id: user.id,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      purpose: "Booked via Assistant",
      status: "pending",
      priority: aiPriority,
    });

    if (error) {
      addMessage("bot", "The booking failed. It might be a schedule conflict.");
      toast.error(error.message);
    } else {
      await notifyAdmins({
        title: "New Booking via Chatbot",
        message: `${user.email?.split("@")[0]} requested ${selectedResource.name} using the assistant.`,
        link: "/admin/bookings",
      });
      addMessage("bot", "Booking successful! I've sent the request to the admin for acceptance.", "success");
      reset();
    }
    setLoading(false);
  };

  const reset = () => {
    setState("idle");
    setSelectedResource(null);
    setStartTime(null);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="mb-4 flex h-[500px] w-80 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in slide-in-from-bottom-4">
          {/* Header */}
          <div className="flex items-center justify-between bg-primary p-4 text-primary-foreground">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <span className="font-bold text-sm">Booking Assistant</span>
            </div>
            <button onClick={() => setIsOpen(false)}><X className="h-4 w-4" /></button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
            {messages.map((m, i) => (
              <div key={i} className={cn(
                "flex flex-col max-w-[85%]",
                m.role === "user" ? "ml-auto items-end" : "items-start"
              )}>
                <div className={cn(
                  "rounded-2xl px-4 py-2 text-sm font-medium leading-relaxed shadow-sm",
                  m.role === "user" 
                    ? "bg-primary text-primary-foreground rounded-tr-none" 
                    : "bg-card border border-border rounded-tl-none",
                  m.type === "success" && "bg-success/10 border-success text-success",
                  m.type === "action" && "bg-primary/5 border-primary/20"
                )}>
                  {m.text}
                </div>
                {m.type === "action" && (
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" onClick={executeBooking} className="h-8 rounded-lg font-bold">Yes, book it</Button>
                    <Button size="sm" variant="outline" onClick={reset} className="h-8 rounded-lg font-bold">Cancel</Button>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Assistant is thinking...</span>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border p-3 bg-card">
            <div className="relative flex items-center gap-2">
              <button
                onClick={toggleListening}
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all",
                  isListening ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                )}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
              <div className="relative flex-1">
                <input
                  className="w-full rounded-xl border border-border bg-muted/50 px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder={isListening ? "Listening..." : "Type or speak..."}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                />
                <button 
                  onClick={() => handleSend()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-primary hover:bg-primary/10"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95",
          isOpen ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"
        )}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </button>
    </div>
  );
}
