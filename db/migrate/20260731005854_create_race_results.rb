class CreateRaceResults < ActiveRecord::Migration[8.1]
  def change
    create_table :race_results do |t|
      t.string :player_name
      t.integer :finish_time_ms
      t.integer :place
      t.integer :laps

      t.timestamps
    end
  end
end
