class ScoresController < ApplicationController
  def index
    @scores = Score.order(position: :asc, total_time: :asc).limit(10)
  end

  def create
    @score = Score.new(score_params)

    if @score.save
      render json: { success: true, score: @score }
    else
      render json: { success: false, errors: @score.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def score_params
    params.require(:score).permit(:player_name, :position, :total_time, :laps)
  end
end
