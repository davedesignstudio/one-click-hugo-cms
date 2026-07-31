class ScoresController < ApplicationController
  def index
    render json: RaceScore.top(10).as_json(only: [ :player_name, :position, :time_ms, :created_at ])
  end

  def create
    score = RaceScore.new(score_params)

    if score.save
      render json: { success: true, rank: RaceScore.rank_for(score) }
    else
      render json: { success: false, errors: score.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def score_params
    params.permit(:player_name, :position, :time_ms)
  end
end
