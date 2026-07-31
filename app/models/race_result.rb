class RaceResult < ApplicationRecord
  TOTAL_LAPS = 3

  validates :player_name, presence: true, length: { maximum: 16 }
  validates :finish_time_ms, presence: true, numericality: { greater_than: 0 }
  validates :place, presence: true, inclusion: { in: 1..4 }
  validates :laps, presence: true, numericality: { equal_to: TOTAL_LAPS }

  before_validation :normalize_player_name

  scope :fastest, -> { order(:finish_time_ms, :created_at) }
  scope :recent, -> { order(created_at: :desc) }

  def finish_time_display
    total_seconds = finish_time_ms / 1000.0
    minutes = (total_seconds / 60).floor
    seconds = total_seconds % 60
    format("%d:%05.2f", minutes, seconds)
  end

  private

  def normalize_player_name
    self.player_name = player_name.to_s.strip.presence || "Racer"
  end
end
