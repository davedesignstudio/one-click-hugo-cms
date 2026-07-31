class RaceResultsController < ApplicationController
  protect_from_forgery with: :exception

  def index
    @track = params[:track].presence
    @results = RaceResult.all
    @results = @results.for_track(@track) if @track && RaceResult::TRACKS.include?(@track)
    @results = @results.top(25)
  end

  def create
    result = RaceResult.new(race_result_params)

    if result.save
      rank = RaceResult.for_track(result.track).where("time_ms < ?", result.time_ms).count + 1
      render json: {
        ok: true,
        id: result.id,
        rank: rank,
        formatted_time: result.formatted_time
      }, status: :created
    else
      render json: { ok: false, errors: result.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def race_result_params
    params.require(:race_result).permit(:player_name, :time_ms, :laps, :weapons_used, :place, :track)
  end
end
