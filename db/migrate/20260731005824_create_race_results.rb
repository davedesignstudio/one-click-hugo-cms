class CreateRaceResults < ActiveRecord::Migration[8.1]
  def change
    create_table :race_results do |t|
      t.string :player_name, null: false
      t.integer :finish_position, null: false
      t.integer :total_time_ms, null: false
      t.integer :best_lap_ms, null: false
      t.integer :items_used, null: false, default: 0
      t.string :character, null: false

      t.timestamps
    end

    add_index :race_results, :total_time_ms
    add_index :race_results, :created_at
  end
end

