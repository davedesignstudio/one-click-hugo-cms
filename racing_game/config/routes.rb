Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  root "game#index"
  get "game", to: "game#index"
end
