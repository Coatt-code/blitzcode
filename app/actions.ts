"use server";
import { createClient } from '@supabase/supabase-js'
const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SECRET_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function scanRooms() {
    const { data: matches, error } = await supabase
    .from('matches')
    .select('*')
    console.log("matches, errors:")
    console.log(matches, error)

    if (Array.isArray(matches) && matches.length > 0) {
        console.log("connecting to existing room...")
        //connectToRoom()
    } else if (Array.isArray(matches) && matches.length === 0) {
        console.log("creating new room...")
        console.log(createNewRoom())
    }
}

async function createNewRoom() {
    const { data, error } = await supabase
        .from('matches')
        .insert([
            { state: 'waiting' },
        ])
        .select()
    return {data, error};
}

