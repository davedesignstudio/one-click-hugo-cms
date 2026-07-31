samples = [
  { player_name: "Blaze", character: "blaze", finish_position: 1, total_time_ms: 95_400, best_lap_ms: 30_200, items_used: 4 },
  { player_name: "Nitro", character: "nitro", finish_position: 2, total_time_ms: 98_750, best_lap_ms: 31_100, items_used: 3 },
  { player_name: "Volt", character: "volt", finish_position: 1, total_time_ms: 93_220, best_lap_ms: 29_800, items_used: 5 }
]

samples.each do |attrs|
  RaceResult.find_or_create_by!(player_name: attrs[:player_name], total_time_ms: attrs[:total_time_ms]) do |result|
    result.assign_attributes(attrs)
  end
end
