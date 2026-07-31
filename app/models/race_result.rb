class RaceResult < ApplicationRecord
  validates :player_name, presence: true, length: { maximum: 20 }
  validates :finish_time, presence: true, numericality: { greater_than: 0 }
  validates :position, presence: true, inclusion: { in: 1..8 }
  validates :laps, presence: true, numericality: { greater_than: 0 }
  validates :weapon_hits, numericality: { greater_than_or_equal_to: 0 }

  scope :top_times, -> { order(:finish_time, :created_at) }

  before_validation :normalize_name
  before_validation :default_weapon_hits

  def rank
    RaceResult.where("finish_time < ?", finish_time).count + 1
  end

  def formatted_time
    minutes = (finish_time / 60).floor
    seconds = finish_time % 60
    format("%d:%05.2f", minutes, seconds)
  end

  private

  def normalize_name
    self.player_name = player_name.to_s.strip.presence || "Racer"
  end

  def default_weapon_hits
    self.weapon_hits = 0 if weapon_hits.nil?
  end
end
