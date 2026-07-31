class GamesController < ApplicationController
  def show
    @total_laps = RaceResult::TOTAL_LAPS
  end
end
