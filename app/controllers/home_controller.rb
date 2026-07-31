class HomeController < ApplicationController
  def index
    @top_results = RaceResult.top(5)
  end
end
