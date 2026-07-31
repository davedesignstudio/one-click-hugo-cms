require "test_helper"

class RaceResultsControllerTest < ActionDispatch::IntegrationTest
  test "creates a race result via json" do
    assert_difference("RaceResult.count") do
      post race_results_url, params: {
        race_result: {
          player_name: "ZIP",
          time_ms: 88_000,
          laps: 3,
          weapons_used: 3,
          place: 1,
          track: "neon_canyon"
        }
      }, as: :json
    end

    assert_response :created
    body = JSON.parse(response.body)
    assert body["ok"]
    assert_equal "1:28.00", body["formatted_time"]
  end

  test "lists leaderboard" do
    RaceResult.create!(
      player_name: "ACE",
      time_ms: 100_000,
      laps: 3,
      place: 1,
      track: "coastal_loop"
    )

    get race_results_url
    assert_response :success
    assert_match "ACE", response.body
  end
end
