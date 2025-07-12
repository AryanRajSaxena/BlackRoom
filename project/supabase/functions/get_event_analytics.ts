// Supabase Edge Function: get_event_analytics.ts
import { serve } from 'https://deno.land/std@0.203.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

serve(async (req) => {
  const url = new URL(req.url)
  const eventId = url.searchParams.get('event_id')

  if (!eventId) {
    return new Response(JSON.stringify({ error: 'Missing event_id' }), {
      status: 400,
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: bets, error: betsError } = await supabase
    .from('bets')
    .select('option_id, amount, placed_at')
    .eq('event_id', eventId)
    .order('placed_at', { ascending: true })

  if (betsError) {
    return new Response(JSON.stringify({ error: betsError.message }), {
      status: 500,
    })
  }

  const timeMap: Record<string, Record<string, number>> = {}

  bets.forEach(({ placed_at, option_id, amount }) => {
    const timeKey = new Date(placed_at).toISOString().slice(0, 16)
    if (!timeMap[timeKey]) timeMap[timeKey] = {}
    if (!timeMap[timeKey][option_id]) timeMap[timeKey][option_id] = 0
    timeMap[timeKey][option_id] += amount
  })

  const timeBuckets = Object.keys(timeMap).sort()
  const historicalData = []

  const { data: eventMeta } = await supabase
    .from('events')
    .select('total_pool, participant_count')
    .eq('id', eventId)
    .single()

  for (const time of timeBuckets) {
    const poolPerOption = timeMap[time]
    const total = Object.values(poolPerOption).reduce((a, b) => a + b, 0)
    const percentages: Record<string, number> = {}

    for (const optionId in poolPerOption) {
      percentages[optionId] = +(poolPerOption[optionId] / total * 100).toFixed(2)
    }

    historicalData.push({
      timestamp: time + ':00',
      percentages,
      totalPool: eventMeta?.total_pool || 0,
      participantCount: eventMeta?.participant_count || 0,
    })
  }

  const { data: optionsData } = await supabase
    .from('bet_options')
    .select('id, label')
    .eq('event_id', eventId)

  const optionColors = ['#16a34a', '#dc2626', '#facc15', '#3b82f6', '#8b5cf6']
  const options = optionsData?.map((opt, idx) => ({
    id: opt.id,
    label: opt.label,
    color: optionColors[idx % optionColors.length],
  })) || []

  return new Response(JSON.stringify({ historicalData, options }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
