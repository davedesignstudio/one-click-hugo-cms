class GamesController < ApplicationController
  def index
    @scores = Score.order(position: :asc, total_time: :asc).limit(5)
  end

  def play
  end
end
