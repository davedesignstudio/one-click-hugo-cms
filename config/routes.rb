Rails.application.routes.draw do
  root "home#index"

  get "race", to: "games#show", as: :race
  resources :race_results, only: %i[index create]

  get "up" => "rails/health#show", as: :rails_health_check
end
