Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  root "games#index"
  get "play", to: "games#play", as: :play
  get "leaderboard", to: "race_results#index", as: :leaderboard
  resources :race_results, only: %i[create]
end
