import { type BookDatabaseAccessor } from '../database_access'
import { type WarehouseData } from '../warehouse/warehouse_data'

export interface AppBookDatabaseState {
  books: BookDatabaseAccessor
}

export interface AppWarehouseDatabaseState {
  warehouse: WarehouseData
}
