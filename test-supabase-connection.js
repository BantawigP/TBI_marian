import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ltngockfkbcgjyksbkyb.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_ikR268SzyQdhdMiJxKV1qg_w8M6RMOf'

console.log('Testing Supabase Connection...')
console.log('URL:', SUPABASE_URL)
console.log('Key (first 20 chars):', SUPABASE_ANON_KEY.substring(0, 20) + '...')

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function testConnection() {
  try {
    // Test 1: Fetch alumni
    console.log('\n=== Test 1: Fetching alumni ===')
    const { data: alumni, error: alumniError } = await supabase
      .from('alumni')
      .select('alumni_id, f_name, l_name')
      .limit(3)
    
    if (alumniError) {
      console.error('Alumni fetch error:', alumniError)
    } else {
      console.log('✓ Alumni fetched successfully:', alumni?.length || 0, 'records')
      console.log('Sample:', alumni?.[0])
    }

    // Test 2: Fetch events
    console.log('\n=== Test 2: Fetching events ===')
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('event_id, title')
      .limit(3)
    
    if (eventsError) {
      console.error('Events fetch error:', eventsError)
    } else {
      console.log('✓ Events fetched successfully:', events?.length || 0, 'records')
    }

    // Test 3: Check RLS policies
    console.log('\n=== Test 3: Checking tables existence ===')
    const tables = ['alumni', 'events', 'colleges', 'programs', 'companies', 'occupations', 'locations', 'event_participants']
    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*').limit(1)
      if (error) {
        console.error(`✗ ${table}:`, error.message)
      } else {
        console.log(`✓ ${table}: accessible`)
      }
    }

  } catch (error) {
    console.error('\n❌ Connection test failed:', error)
  }
}

testConnection()
