class CreateRaceScores < ActiveRecord::Migration[8.1]
  def change
    create_table :race_scores do |t|
      t.string :player_name, null: false
      t.integer :position, null: false
      t.integer :time_ms, null: false

      t.timestamps
    end

    add_index :race_scores, :time_ms
  end
end
