# google_ads_python_service.py
#!/usr/bin/env python3
"""
Python service that handles Google Ads operations using the official client library
"""
import json
import sys
import uuid
from datetime import datetime, timedelta
from google.ads.googleads.client import GoogleAdsClient
from google.ads.googleads.errors import GoogleAdsException

def create_campaign(customer_id: str, campaign_data: dict) -> dict:
    """
    Create a campaign using the official Google Ads Python client library
    """
    try:
        # Initialize the Google Ads client
        client = GoogleAdsClient.load_from_storage(version="v21")
        
        # Create campaign budget first
        budget_service = client.get_service("CampaignBudgetService")
        budget_operation = client.get_type("CampaignBudgetOperation")
        budget = budget_operation.create
        
        # Set budget properties
        budget.name = f"{campaign_data.get('name', 'Campaign')} Budget {uuid.uuid4()}"
        budget.amount_micros = int(campaign_data.get('daily_budget', 50) * 1000000)
        budget.delivery_method = client.enums.BudgetDeliveryMethodEnum.STANDARD
        
        # Add budget
        budget_response = budget_service.mutate_campaign_budgets(
            customer_id=customer_id,
            operations=[budget_operation],
        )
        
        budget_resource_name = budget_response.results[0].resource_name
        
        # Create campaign
        campaign_service = client.get_service("CampaignService")
        campaign_operation = client.get_type("CampaignOperation")
        campaign = campaign_operation.create
        
        # Set campaign properties
        campaign.name = f"{campaign_data.get('name', 'Campaign')} {uuid.uuid4()}"
        campaign.advertising_channel_type = client.enums.AdvertisingChannelTypeEnum.SEARCH
        
        # Set campaign status
        status = campaign_data.get('status', 'PAUSED').upper()
        if status == 'ACTIVE':
            campaign.status = client.enums.CampaignStatusEnum.ENABLED
        else:
            campaign.status = client.enums.CampaignStatusEnum.PAUSED
        
        # Set budget
        campaign.campaign_budget = budget_resource_name
        
        # Set bidding strategy
        campaign.manual_cpc = client.get_type("ManualCpc")
        
        # Set network settings
        campaign.network_settings.target_google_search = True
        campaign.network_settings.target_search_network = True
        campaign.network_settings.target_content_network = False
        campaign.network_settings.target_partner_search_network = False
        
        # Set political advertising status
        campaign.contains_eu_political_advertising = (
            client.enums.EuPoliticalAdvertisingStatusEnum.DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING
        )
        
        # Set start date if provided
        if campaign_data.get('start_time'):
            start_date = datetime.fromisoformat(campaign_data['start_time'].replace('Z', '+00:00'))
            campaign.start_date = start_date.strftime("%Y%m%d")
        
        # Add campaign
        campaign_response = campaign_service.mutate_campaigns(
            customer_id=customer_id,
            operations=[campaign_operation],
        )
        
        campaign_resource_name = campaign_response.results[0].resource_name
        
        return {
            "success": True,
            "campaign_id": campaign_resource_name.split('/')[-1],
            "resource_name": campaign_resource_name,
            "budget_resource_name": budget_resource_name
        }
        
    except GoogleAdsException as ex:
        error_details = []
        for error in ex.failure.errors:
            error_info = {
                "message": error.message,
                "code": error.error_code.__class__.__name__,
                "field": error.location.field_path_elements[0].field_name if error.location else "unknown"
            }
            error_details.append(error_info)
        
        return {
            "success": False,
            "error_type": "GoogleAdsException",
            "error_message": str(ex),
            "request_id": ex.request_id,
            "error_details": error_details
        }
        
    except Exception as e:
        return {
            "success": False,
            "error_type": "GeneralException",
            "error_message": str(e)
        }

def main():
    """
    Main function to handle command line execution
    """
    if len(sys.argv) != 3:
        print(json.dumps({
            "success": False,
            "error": "Usage: python google_ads_python_service.py <customer_id> <campaign_data_json>"
        }))
        sys.exit(1)
    
    try:
        customer_id = sys.argv[1]
        campaign_data_json = sys.argv[2]
        campaign_data = json.loads(campaign_data_json)
        
        result = create_campaign(customer_id, campaign_data)
        print(json.dumps(result))
        
    except json.JSONDecodeError:
        print(json.dumps({
            "success": False,
            "error": "Invalid JSON data"
        }))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": f"Unexpected error: {str(e)}"
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()