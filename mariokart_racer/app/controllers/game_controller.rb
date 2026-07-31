class GameController < ApplicationController
  def index
    @top_scores = RaceScore.top(10)
  end
end
