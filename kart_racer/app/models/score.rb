class Score < ApplicationRecord
  validates :player_name, presence: true, length: { maximum: 20 }
  validates :position, presence: true, numericality: { only_integer: true, greater_than: 0, less_than_or_equal_to: 8 }
  validates :total_time, presence: true, numericality: { greater_than: 0 }
  validates :laps, presence: true, numericality: { only_integer: true, greater_than: 0 }
end
