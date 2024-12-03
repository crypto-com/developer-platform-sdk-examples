@Codebase
# cursor compose template
modify to add these user function calls
add function call for openal, gemini

## get greeting
- function name: get_greeting
- description: get a greeting for a given name
- workflow: 
  - get a name from the user
  - return a greeting
- args:
  - name: string
- returns:
  - data: json
  - status
  
## get aprs
- function name: get_aprs
- description: get h2 farming apr status
- workflow: get json from this url "https://api.h2.finance/general/api/info/v1/farm-aprs"
- args:
  - none
- returns:
  - data: json
  - status


## get wolfswap USDC-MOON quote
- function name: get_usdc_moon_quote
- description: get a quote for USDC to MOON swap from Wolfswap
- workflow: 
  - POST request to https://api-partners.wolfswap.app/v1/quote
  - include API key from env WOLFSWAP_API_KEY
  - hardcoded token addresses:
    - USDC: "0xc21223249ca28397b4b6541dffaecc539bff0c59"
    - MOON: "0x46E2B5423F6ff46A8A35861EC9DAfF26af77AB9A"
  - converts user input to USDC decimals (6)
- args:
  - amount: number (e.g., 1 for 1 USDC, will be converted to 1000000)
- returns:
  - data: json (Wolfswap quote response)
  - status

