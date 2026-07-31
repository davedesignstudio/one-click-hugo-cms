class CreateRaceResults < ActiveRecord::Migration[8.1]
  def change
    create_table :race_results do |t|
      t.string :player_name
      t.float :finish_time
      t.integer :position
      t.integer :laps
      t.integer :weapon_hits

      t.timestamps
    end
  end
end
