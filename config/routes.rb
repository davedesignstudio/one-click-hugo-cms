Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  root "home#index"
  get "play", to: "games#show", as: :play

  resources :race_results, only: %i[index create]
end
