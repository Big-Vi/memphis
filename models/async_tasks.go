package models

import "time"

type AsyncTask struct {
	ID            int         `json:"id"`
	Name          string      `json:"name"`
	BrokrInCharge string      `json:"broker_in_charge"`
	CreatedAt     time.Time   `json:"created_at"`
	UpdatedAt     time.Time   `json:"updated_at"`
	Data          interface{} `json:"data"`
	TenantName    string      `json:"tenant_name"`
	StationId     int         `json:"station_id"`
	CreatedBy     string      `json:"created_by"`
}

type AsyncTaskRes struct {
	ID          int       `json:"id"`
	Name        string    `json:"name"`
	CreatedAt   time.Time `json:"created_at"`
	CreatedBy   string    `json:"created_by"`
	StationName string    `json:"station_name"`
}

type MetaData struct {
	Offset int `json:"offset"`
}
