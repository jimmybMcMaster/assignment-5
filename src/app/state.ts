import { type BookDatabaseAccessor } from '../database_access'
import { type DatabaseWarehouse } from '../warehouse/warehouse_database'

export interface AppBookDatabaseState {
  books: BookDatabaseAccessor
}

export interface AppWarehouseDatabaseState {
  warehouse: DatabaseWarehouse
}
