class RacesController < ApplicationController
  def show
    @player_name = params[:player_name].to_s.strip.upcase.presence || "RACER"
    @track = RaceResult::TRACKS.include?(params[:track]) ? params[:track] : RaceResult::TRACKS.first
  end
end
