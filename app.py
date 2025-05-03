import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import pandas as pd
from datetime import datetime, timedelta
import calendar
from pathlib import Path

# Import our custom modules
from data_analyzer import analyze_sales_data
from report_generator import generate_report

# Initialize FastAPI app
app = FastAPI(title="ERP Report Generator")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files directory
static_dir = Path("static")
static_dir.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Data model
class ReportRequest(BaseModel):
    time_period: str  # e.g., "last_month", "current_month", "last_quarter"
    categories: Optional[List[str]] = None
    regions: Optional[List[str]] = None

class ReportResponse(BaseModel):
    report_text: str
    metrics: Dict[str, Any]

@app.get("/")
async def read_root():
    """Redirect to the frontend UI"""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/static/index.html")

@app.get("/data")
async def get_data():
    """Return the raw data for display purposes"""
    try:
        df = pd.read_csv("data/sales_data.csv")
        return {"data": df.to_dict(orient="records")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching data: {str(e)}")

@app.post("/generate-report", response_model=ReportResponse)
async def create_report(request: ReportRequest):
    """Generate a report based on the specified parameters"""
    try:
        # Load data
        df = pd.read_csv("data/sales_data.csv")
        
        # Convert date strings to datetime objects
        df['Date'] = pd.to_datetime(df['Date'])
        
        # Filter by time period
        filtered_df = filter_by_time_period(df, request.time_period)
        
        # Apply additional filters if provided
        if request.categories and len(request.categories) > 0:
            filtered_df = filtered_df[filtered_df['Category'].isin(request.categories)]
        
        if request.regions and len(request.regions) > 0:
            filtered_df = filtered_df[filtered_df['Region'].isin(request.regions)]
        
        # Check if the dataframe is empty after filtering
        if filtered_df.empty:
            return {
                "report_text": "No data available for the selected filters. Please adjust your criteria and try again.",
                "metrics": {"error": "No data available"}
            }
        
        # Analyze the data
        metrics = analyze_sales_data(filtered_df)
        
        # Generate the report using Groq
        report_text = generate_report(metrics)
        
        return {
            "report_text": report_text,
            "metrics": metrics
        }
    
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print("Error generating report:", str(e))
        print(error_detail)
        
        # Return a response even in case of error, to avoid UI hanging
        return {
            "report_text": f"Error generating report: {str(e)}. Please try again or contact support if the issue persists.",
            "metrics": {"error": str(e)}
        }

def filter_by_time_period(df, time_period):
    """Filter dataframe based on the selected time period"""
    today = datetime.now()
    
    if time_period == "current_month":
        start_date = datetime(today.year, today.month, 1)
        return df[df['Date'] >= start_date]
    
    elif time_period == "last_month":
        start_date = (today.replace(day=1) - timedelta(days=1)).replace(day=1)
        end_date = today.replace(day=1) - timedelta(days=1)
        return df[(df['Date'] >= start_date) & (df['Date'] <= end_date)]
    
    elif time_period == "last_quarter":
        current_quarter = (today.month - 1) // 3 + 1
        last_quarter = current_quarter - 1 if current_quarter > 1 else 4
        year = today.year if current_quarter > 1 else today.year - 1
        
        if last_quarter == 4:
            start_month = 10
        elif last_quarter == 3:
            start_month = 7
        elif last_quarter == 2:
            start_month = 4
        else:
            start_month = 1
        
        end_month = start_month + 2
        
        start_date = datetime(year, start_month, 1)
        end_date = datetime(year, end_month, calendar.monthrange(year, end_month)[1])
        
        return df[(df['Date'] >= start_date) & (df['Date'] <= end_date)]
    
    # Default: return last 30 days
    else:
        start_date = today - timedelta(days=30)
        return df[df['Date'] >= start_date]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
