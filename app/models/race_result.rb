class RaceResult < ApplicationRecord
  CHARACTERS = %w[blaze nitro volt comet ghost spark].freeze

  validates :player_name, presence: true, length: { maximum: 24 }
  validates :finish_position, presence: true, inclusion: { in: 1..8 }
  validates :total_time_ms, presence: true, numericality: { greater_than: 0 }
  validates :best_lap_ms, presence: true, numericality: { greater_than: 0 }
  validates :items_used, numericality: { greater_than_or_equal_to: 0 }
  validates :character, inclusion: { in: CHARACTERS }

  scope :top_times, -> { order(:total_time_ms, :best_lap_ms, :created_at) }
  scope :recent, -> { order(created_at: :desc) }

  def formatted_total
    format_ms(total_time_ms)
  end

  def formatted_best_lap
    format_ms(best_lap_ms)
  end

  def rank_among_times
    RaceResult.where("total_time_ms < ?", total_time_ms).count + 1
  end

  private

  def format_ms(ms)
    total_seconds = ms / 1000.0
    minutes = (total_seconds / 60).floor
    seconds = (total_seconds % 60).floor
    hundredths = ((total_seconds - total_seconds.floor) * 100).floor
    format("%d:%02d.%02d", minutes, seconds, hundredths)
  end
end
