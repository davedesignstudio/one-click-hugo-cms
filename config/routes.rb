Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  root "home#index"

  resource :race, only: :show
  resources :race_results, only: %i[index create]
end
