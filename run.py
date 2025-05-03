import os
import uvicorn
from pathlib import Path
from generate_mock_data import generate_mock_sales_data

def main():
    """Entry point for running the ERP Report Generator application."""
    # Create necessary directories
    Path("data").mkdir(exist_ok=True)
    Path("static").mkdir(exist_ok=True)
    
    # Generate mock data if it doesn't exist
    if not os.path.exists("data/sales_data.csv"):
        print("Mock data not found. Generating fresh sample data...")
        generate_mock_sales_data()
    
    # Run the FastAPI application
    print("Starting ERP Report Generator API...")
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)

if __name__ == "__main__":
    main()
