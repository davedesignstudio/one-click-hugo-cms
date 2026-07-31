class CreateRaceResults < ActiveRecord::Migration[8.1]
  def change
    create_table :race_results do |t|
      t.string :player_name
      t.integer :time_ms
      t.integer :laps
      t.integer :weapons_used
      t.integer :place
      t.string :track

      t.timestamps
    end
  end
end
