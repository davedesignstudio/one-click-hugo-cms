class GamesController < ApplicationController
  def show
    @leaderboard = RaceResult.top_times.limit(5)
  end
end
