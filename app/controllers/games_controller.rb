class GamesController < ApplicationController
  CHARACTERS = [
    { id: "blaze", name: "Blaze", color: "#e85d04", accent: "#ffba08" },
    { id: "nitro", name: "Nitro", color: "#0077b6", accent: "#90e0ef" },
    { id: "volt", name: "Volt", color: "#2d6a4f", accent: "#95d5b2" },
    { id: "comet", name: "Comet", color: "#9b2226", accent: "#ee9b00" },
    { id: "ghost", name: "Ghost", color: "#4a4e69", accent: "#c9ada7" },
    { id: "spark", name: "Spark", color: "#f72585", accent: "#b5179e" }
  ].freeze

  def index
    @characters = CHARACTERS
    @top_results = RaceResult.top_times.limit(5)
  end

  def play
    @characters = CHARACTERS
    @character = CHARACTERS.find { |c| c[:id] == params[:character] } || CHARACTERS.first
    @player_name = params[:name].to_s.strip.presence || "Racer"
  end
end
