class RaceScore < ApplicationRecord
  validates :player_name, presence: true, length: { maximum: 30 }
  validates :position, presence: true, inclusion: { in: 1..8 }
  validates :time_ms, presence: true, numericality: { greater_than: 0 }

  scope :by_time, -> { order(time_ms: :asc) }

  def self.top(limit = 10)
    by_time.limit(limit)
  end

  def self.rank_for(score)
    by_time.where("time_ms < ?", score.time_ms).count + 1
  end

  def formatted_time
    total_seconds = time_ms / 1000.0
    minutes = (total_seconds / 60).floor
    seconds = total_seconds % 60
    format("%d:%05.2f", minutes, seconds)
  end
end
