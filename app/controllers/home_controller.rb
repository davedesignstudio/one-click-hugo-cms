class HomeController < ApplicationController
  def index
    @top_results = RaceResult.fastest.limit(5)
  end
end
