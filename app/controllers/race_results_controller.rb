class RaceResultsController < ApplicationController
  protect_from_forgery with: :exception

  def index
    @results = RaceResult.top_times.limit(25)
    @podium = @results.first(3)
  end

  def create
    result = RaceResult.new(race_result_params)

    if result.save
      render json: { ok: true, id: result.id, rank: result.rank_among_times }, status: :created
    else
      render json: { ok: false, errors: result.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def race_result_params
    params.require(:race_result).permit(
      :player_name, :finish_position, :total_time_ms, :best_lap_ms, :items_used, :character
    )
  end
end
