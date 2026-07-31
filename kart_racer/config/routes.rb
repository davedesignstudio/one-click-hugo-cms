Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  root "games#index"

  get "play", to: "games#play", as: :play
  resources :scores, only: [:index, :create]
end
