import os
from typing import Dict, Any
import json
from dotenv import load_dotenv
from groq import Groq

# Load environment variables
load_dotenv()

def get_groq_client():
    """Initialize and return the Groq client"""
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY environment variable is not set")
    
    return Groq(api_key=api_key)

def generate_report(metrics: Dict[str, Any]) -> str:
    """Generate a natural language report from the metrics using Groq"""
    
    try:
        # Format metrics for better readability in the prompt
        # Convert metrics to a simple string format for the prompt
        metrics_str = "\n".join([
            f"Total Revenue: ${metrics.get('total_revenue', 0):,.2f}",
            f"Units Sold: {metrics.get('total_units_sold', 0):,}",
            f"Average Unit Price: ${metrics.get('average_unit_price', 0):,.2f}",
            f"Revenue Growth: {metrics.get('revenue_growth', 0):.1f}% compared to previous period",
            f"Top Product: {metrics.get('top_product_name', 'N/A')} (${metrics.get('top_product_revenue', 0):,.2f})",
            f"Top Category: {metrics.get('top_category', 'N/A')}",
            f"Top Region: {metrics.get('top_region', 'N/A')}"
        ])
        
        # Create a prompt for the report generation
        prompt = f"""
        As an expert business analyst, create a concise, professional business summary report based on the following ERP metrics:

        {metrics_str}
        
        Write a professional business report (around 250 words) that:
        1. Summarizes overall performance
        2. Highlights key trends and changes
        3. Identifies top-performing products/categories/regions
        4. Notes any inventory concerns if available
        5. Provides 1-2 actionable recommendations based on the data
        
        The report should be factual, data-driven, and professional in tone.
        """
        
        # Initialize the Groq client
        client = get_groq_client()
        
        # Call the Groq API with a timeout
        chat_completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",  # Using a smaller, faster model to avoid timeouts
            messages=[
                {"role": "system", "content": "You are an expert business analyst creating data-driven ERP reports."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=800
        )
        
        # Extract and return the generated report
        return chat_completion.choices[0].message.content
        
    except Exception as e:
        import traceback
        print(f"Error generating report with Groq: {str(e)}")
        print(traceback.format_exc())
        
        # Return a fallback report when the API fails
        return f"""
        ## Business Performance Summary
        
        Total revenue was ${metrics.get('total_revenue', 0):,.2f} with {metrics.get('total_units_sold', 0):,} units sold.
        
        The top product was {metrics.get('top_product_name', 'unknown')}, contributing ${metrics.get('top_product_revenue', 0):,.2f} in revenue.
        
        Revenue {("increased" if metrics.get('revenue_growth', 0) >= 0 else "decreased")} by {abs(metrics.get('revenue_growth', 0)):.1f}% compared to the previous period.
        
        **Note:** This is a simplified report generated when the AI service was unavailable.
        """
