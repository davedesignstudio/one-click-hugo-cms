class HomeController < ApplicationController
  def index
    @leaderboard = RaceResult.top_times.limit(8)
  end
end
