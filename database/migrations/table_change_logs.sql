-- Table Change Logs
-- Tracks all table switches with timestamp and operator info

CREATE TABLE IF NOT EXISTS table_change_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,

  -- Previous table info
  old_room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  old_table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
  old_room_name TEXT,
  old_table_number INTEGER,

  -- New table info
  new_room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  new_table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
  new_room_name TEXT,
  new_table_number INTEGER,

  -- Operator and timing
  changed_by_user_id UUID, -- Auth user ID or staff ID
  changed_by_name TEXT, -- Store name to preserve history even if user is deleted
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Optional notes
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_table_change_logs_order_id ON table_change_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_table_change_logs_restaurant_id ON table_change_logs(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_table_change_logs_changed_at ON table_change_logs(changed_at DESC);

-- RLS Policies
ALTER TABLE table_change_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Restaurant owners can view logs for their restaurant
CREATE POLICY "Restaurant owners can view table change logs"
  ON table_change_logs
  FOR SELECT
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE user_id = auth.uid()
    )
  );

-- Policy: Restaurant owners can insert logs for their restaurant
CREATE POLICY "Restaurant owners can insert table change logs"
  ON table_change_logs
  FOR INSERT
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE user_id = auth.uid()
    )
  );

-- Policy: Restaurant staff can view and insert logs for their restaurant
CREATE POLICY "Restaurant staff can view table change logs"
  ON table_change_logs
  FOR SELECT
  USING (
    restaurant_id::text = current_setting('app.restaurant_id', true)
  );

CREATE POLICY "Restaurant staff can insert table change logs"
  ON table_change_logs
  FOR INSERT
  WITH CHECK (
    restaurant_id::text = current_setting('app.restaurant_id', true)
  );

COMMENT ON TABLE table_change_logs IS 'Audit log for table changes - tracks who moved orders between tables and when';
COMMENT ON COLUMN table_change_logs.old_room_name IS 'Room name stored at time of change for historical accuracy';
COMMENT ON COLUMN table_change_logs.old_table_number IS 'Table number stored at time of change for historical accuracy';
COMMENT ON COLUMN table_change_logs.changed_by_name IS 'User name stored at time of change to preserve history';
