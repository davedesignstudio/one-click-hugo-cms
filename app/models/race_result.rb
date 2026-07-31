class RaceResult < ApplicationRecord
  TRACKS = %w[coastal_loop thunder_bowl neon_canyon].freeze

  validates :player_name, presence: true, length: { minimum: 1, maximum: 16 }
  validates :time_ms, presence: true, numericality: { greater_than: 0 }
  validates :laps, presence: true, numericality: { greater_than: 0 }
  validates :weapons_used, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :place, numericality: { in: 1..8 }, allow_nil: true
  validates :track, inclusion: { in: TRACKS }

  before_validation :normalize_name

  scope :by_best_time, -> { order(:time_ms) }
  scope :for_track, ->(track) { where(track: track) }
  scope :top, ->(limit = 10) { by_best_time.limit(limit) }

  def formatted_time
    total_cs = (time_ms / 10.0).round
    minutes = total_cs / 6000
    seconds = (total_cs % 6000) / 100
    centis = total_cs % 100
    format("%d:%02d.%02d", minutes, seconds, centis)
  end

  private

  def normalize_name
    self.player_name = player_name.to_s.strip.upcase.presence
  end
end
