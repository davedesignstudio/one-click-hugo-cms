require "test_helper"

class RaceResultTest < ActiveSupport::TestCase
  test "formats time and normalizes name" do
    result = RaceResult.create!(
      player_name: " amp ",
      time_ms: 125_000,
      laps: 3,
      weapons_used: 1,
      place: 2,
      track: "coastal_loop"
    )

    assert_equal "AMP", result.player_name
    assert_equal "2:05.00", result.formatted_time
  end

  test "rejects unknown tracks" do
    result = RaceResult.new(
      player_name: "X",
      time_ms: 1000,
      laps: 3,
      track: "moon"
    )

    assert_not result.valid?
    assert_includes result.errors[:track], "is not included in the list"
  end
end
