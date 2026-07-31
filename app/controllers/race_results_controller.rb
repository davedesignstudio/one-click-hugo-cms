class RaceResultsController < ApplicationController
  def index
    @results = RaceResult.fastest.limit(25)
  end

  def create
    result = RaceResult.new(race_result_params)

    if result.save
      render json: {
        id: result.id,
        player_name: result.player_name,
        finish_time_display: result.finish_time_display,
        place: result.place
      }, status: :created
    else
      render json: { errors: result.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def race_result_params
    params.require(:race_result).permit(:player_name, :finish_time_ms, :place, :laps)
  end
end
