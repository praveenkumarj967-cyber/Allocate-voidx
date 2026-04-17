import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export async function seedSystemResources() {
  try {
    // 1. Ensure Categories Exist
    let { data: categories } = await supabase.from("resource_categories").select("id, name");
    
    if (!categories || categories.length === 0) {
      toast.info("Creating system categories...");
      const { data: newCats, error: catErr } = await supabase.from("resource_categories").insert([
        { name: 'Labs', description: 'Research and computer labs', icon: 'flask-conical' },
        { name: 'Meeting Rooms', description: 'Conference and meeting rooms', icon: 'users' },
        { name: 'Equipment', description: 'Specialized equipment and tools', icon: 'wrench' },
        { name: 'Beds', description: 'Hospital and recovery beds', icon: 'bed' }
      ]).select();
      
      if (catErr) throw catErr;
      categories = newCats;
    }

    const labId = categories.find(c => c.name === 'Labs')?.id;
    const equipId = categories.find(c => c.name === 'Equipment')?.id;
    const roomId = categories.find(c => c.name === 'Meeting Rooms')?.id;

    // 2. Insert Sample Resources
    const resources = [
      {
        name: "Neural Lab Alpha",
        category_id: labId || categories[0].id,
        description: "High-performance compute node for AI training and neural simulations.",
        location: "Block A, Level 4",
        capacity: 10,
        hourly_cost: 50,
        status: "active",
      },
      {
        name: "Precision Oscilloscope X-100",
        category_id: equipId || categories[0].id,
        description: "Ultra-high frequency signal analysis tool for hardware engineering.",
        location: "Hardware Lab 1",
        capacity: 1,
        hourly_cost: 15,
        status: "active",
      },
      {
        name: "Executive Suite 402",
        category_id: roomId || categories[0].id,
        description: "Glass-walled conference room with 8K telepresence system.",
        location: "Innovation Hub, Level 2",
        capacity: 12,
        hourly_cost: 30,
        status: "active",
      },
      {
        name: "Tesla Coil Array",
        category_id: equipId || categories[0].id,
        description: "Experimental energy transmission testing rig.",
        location: "Experimental Wing",
        capacity: 1,
        hourly_cost: 100,
        status: "maintenance",
      }
    ];

    const { error } = await supabase.from("resources").insert(resources);
    if (error) throw error;

    toast.success("System Resources Seeded Successfully!");
    return true;
  } catch (err: any) {
    console.error("Seeding error:", err);
    toast.error(`Seeding failed: ${err.message}`);
    return false;
  }
}

export async function promoteToAdmin(userId: string) {
  try {
    const { error } = await supabase.from("user_roles").upsert({
      user_id: userId,
      role: "admin"
    }, { onConflict: 'user_id,role' });
    if (error) throw error;
    toast.success("Identity Elevated: You are now a System Administrator");
    return true;
  } catch (err: any) {
    toast.error(`Elevation failed: ${err.message}`);
    return false;
  }
}
