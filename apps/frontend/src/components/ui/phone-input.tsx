import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { maxPhoneDigits } from "@/lib/validation/inline-field-validation"

// Country calling codes, one entry per code (countries that share a code share an entry)
export const COUNTRY_CODES = [
  { value: "+1", label: "USA/Canada (+1)", code: "US/CA" },
  { value: "+44", label: "UK (+44)", code: "GB" },
  { value: "+91", label: "India (+91)", code: "IN" },
  { value: "+61", label: "Australia (+61)", code: "AU" },
  { value: "+81", label: "Japan (+81)", code: "JP" },
  { value: "+86", label: "China (+86)", code: "CN" },
  { value: "+49", label: "Germany (+49)", code: "DE" },
  { value: "+33", label: "France (+33)", code: "FR" },
  { value: "+39", label: "Italy (+39)", code: "IT" },
  { value: "+34", label: "Spain (+34)", code: "ES" },
  { value: "+55", label: "Brazil (+55)", code: "BR" },
  { value: "+52", label: "Mexico (+52)", code: "MX" },
  { value: "+27", label: "South Africa (+27)", code: "ZA" },
  { value: "+7", label: "Russia/Kazakhstan (+7)", code: "RU/KZ" },
  { value: "+971", label: "UAE (+971)", code: "AE" },
  { value: "+966", label: "Saudi Arabia (+966)", code: "SA" },
  { value: "+65", label: "Singapore (+65)", code: "SG" },
  { value: "+60", label: "Malaysia (+60)", code: "MY" },
  { value: "+62", label: "Indonesia (+62)", code: "ID" },
  { value: "+63", label: "Philippines (+63)", code: "PH" },
  { value: "+66", label: "Thailand (+66)", code: "TH" },
  { value: "+82", label: "South Korea (+82)", code: "KR" },
  { value: "+84", label: "Vietnam (+84)", code: "VN" },
  { value: "+90", label: "Turkey (+90)", code: "TR" },
  { value: "+20", label: "Egypt (+20)", code: "EG" },
  { value: "+234", label: "Nigeria (+234)", code: "NG" },
  { value: "+254", label: "Kenya (+254)", code: "KE" },
  { value: "+31", label: "Netherlands (+31)", code: "NL" },
  { value: "+32", label: "Belgium (+32)", code: "BE" },
  { value: "+41", label: "Switzerland (+41)", code: "CH" },
  { value: "+43", label: "Austria (+43)", code: "AT" },
  { value: "+46", label: "Sweden (+46)", code: "SE" },
  { value: "+47", label: "Norway (+47)", code: "NO" },
  { value: "+48", label: "Poland (+48)", code: "PL" },
  { value: "+45", label: "Denmark (+45)", code: "DK" },
  { value: "+358", label: "Finland (+358)", code: "FI" },
  { value: "+351", label: "Portugal (+351)", code: "PT" },
  { value: "+30", label: "Greece (+30)", code: "GR" },
  { value: "+420", label: "Czechia (+420)", code: "CZ" },
  { value: "+36", label: "Hungary (+36)", code: "HU" },
  { value: "+40", label: "Romania (+40)", code: "RO" },
  { value: "+380", label: "Ukraine (+380)", code: "UA" },
  { value: "+92", label: "Pakistan (+92)", code: "PK" },
  { value: "+880", label: "Bangladesh (+880)", code: "BD" },
  { value: "+94", label: "Sri Lanka (+94)", code: "LK" },
  { value: "+977", label: "Nepal (+977)", code: "NP" },
  { value: "+54", label: "Argentina (+54)", code: "AR" },
  { value: "+56", label: "Chile (+56)", code: "CL" },
  { value: "+57", label: "Colombia (+57)", code: "CO" },
  { value: "+51", label: "Peru (+51)", code: "PE" },
  { value: "+58", label: "Venezuela (+58)", code: "VE" },
  { value: "+64", label: "New Zealand (+64)", code: "NZ" },
  { value: "+93", label: "Afghanistan (+93)", code: "AF" },
  { value: "+355", label: "Albania (+355)", code: "AL" },
  { value: "+213", label: "Algeria (+213)", code: "DZ" },
  { value: "+376", label: "Andorra (+376)", code: "AD" },
  { value: "+244", label: "Angola (+244)", code: "AO" },
  { value: "+374", label: "Armenia (+374)", code: "AM" },
  { value: "+297", label: "Aruba (+297)", code: "AW" },
  { value: "+247", label: "Ascension Island (+247)", code: "AC" },
  { value: "+994", label: "Azerbaijan (+994)", code: "AZ" },
  { value: "+973", label: "Bahrain (+973)", code: "BH" },
  { value: "+375", label: "Belarus (+375)", code: "BY" },
  { value: "+501", label: "Belize (+501)", code: "BZ" },
  { value: "+229", label: "Benin (+229)", code: "BJ" },
  { value: "+975", label: "Bhutan (+975)", code: "BT" },
  { value: "+591", label: "Bolivia (+591)", code: "BO" },
  { value: "+387", label: "Bosnia and Herzegovina (+387)", code: "BA" },
  { value: "+267", label: "Botswana (+267)", code: "BW" },
  { value: "+246", label: "British Indian Ocean Territory (+246)", code: "IO" },
  { value: "+673", label: "Brunei (+673)", code: "BN" },
  { value: "+359", label: "Bulgaria (+359)", code: "BG" },
  { value: "+226", label: "Burkina Faso (+226)", code: "BF" },
  { value: "+257", label: "Burundi (+257)", code: "BI" },
  { value: "+855", label: "Cambodia (+855)", code: "KH" },
  { value: "+237", label: "Cameroon (+237)", code: "CM" },
  { value: "+238", label: "Cape Verde (+238)", code: "CV" },
  { value: "+236", label: "Central African Republic (+236)", code: "CF" },
  { value: "+235", label: "Chad (+235)", code: "TD" },
  { value: "+269", label: "Comoros (+269)", code: "KM" },
  { value: "+242", label: "Congo (+242)", code: "CG" },
  { value: "+243", label: "DR Congo (+243)", code: "CD" },
  { value: "+682", label: "Cook Islands (+682)", code: "CK" },
  { value: "+506", label: "Costa Rica (+506)", code: "CR" },
  { value: "+225", label: "Ivory Coast (+225)", code: "CI" },
  { value: "+385", label: "Croatia (+385)", code: "HR" },
  { value: "+53", label: "Cuba (+53)", code: "CU" },
  { value: "+599", label: "Curacao (+599)", code: "CW" },
  { value: "+357", label: "Cyprus (+357)", code: "CY" },
  { value: "+253", label: "Djibouti (+253)", code: "DJ" },
  { value: "+593", label: "Ecuador (+593)", code: "EC" },
  { value: "+503", label: "El Salvador (+503)", code: "SV" },
  { value: "+240", label: "Equatorial Guinea (+240)", code: "GQ" },
  { value: "+291", label: "Eritrea (+291)", code: "ER" },
  { value: "+372", label: "Estonia (+372)", code: "EE" },
  { value: "+268", label: "Eswatini (+268)", code: "SZ" },
  { value: "+251", label: "Ethiopia (+251)", code: "ET" },
  { value: "+500", label: "Falkland Islands (+500)", code: "FK" },
  { value: "+298", label: "Faroe Islands (+298)", code: "FO" },
  { value: "+679", label: "Fiji (+679)", code: "FJ" },
  { value: "+594", label: "French Guiana (+594)", code: "GF" },
  { value: "+689", label: "French Polynesia (+689)", code: "PF" },
  { value: "+241", label: "Gabon (+241)", code: "GA" },
  { value: "+220", label: "Gambia (+220)", code: "GM" },
  { value: "+995", label: "Georgia (+995)", code: "GE" },
  { value: "+233", label: "Ghana (+233)", code: "GH" },
  { value: "+350", label: "Gibraltar (+350)", code: "GI" },
  { value: "+299", label: "Greenland (+299)", code: "GL" },
  { value: "+590", label: "Guadeloupe (+590)", code: "GP" },
  { value: "+502", label: "Guatemala (+502)", code: "GT" },
  { value: "+224", label: "Guinea (+224)", code: "GN" },
  { value: "+245", label: "Guinea-Bissau (+245)", code: "GW" },
  { value: "+592", label: "Guyana (+592)", code: "GY" },
  { value: "+509", label: "Haiti (+509)", code: "HT" },
  { value: "+504", label: "Honduras (+504)", code: "HN" },
  { value: "+852", label: "Hong Kong (+852)", code: "HK" },
  { value: "+354", label: "Iceland (+354)", code: "IS" },
  { value: "+98", label: "Iran (+98)", code: "IR" },
  { value: "+964", label: "Iraq (+964)", code: "IQ" },
  { value: "+353", label: "Ireland (+353)", code: "IE" },
  { value: "+972", label: "Israel (+972)", code: "IL" },
  { value: "+962", label: "Jordan (+962)", code: "JO" },
  { value: "+686", label: "Kiribati (+686)", code: "KI" },
  { value: "+383", label: "Kosovo (+383)", code: "XK" },
  { value: "+965", label: "Kuwait (+965)", code: "KW" },
  { value: "+996", label: "Kyrgyzstan (+996)", code: "KG" },
  { value: "+856", label: "Laos (+856)", code: "LA" },
  { value: "+371", label: "Latvia (+371)", code: "LV" },
  { value: "+961", label: "Lebanon (+961)", code: "LB" },
  { value: "+266", label: "Lesotho (+266)", code: "LS" },
  { value: "+231", label: "Liberia (+231)", code: "LR" },
  { value: "+218", label: "Libya (+218)", code: "LY" },
  { value: "+423", label: "Liechtenstein (+423)", code: "LI" },
  { value: "+370", label: "Lithuania (+370)", code: "LT" },
  { value: "+352", label: "Luxembourg (+352)", code: "LU" },
  { value: "+853", label: "Macau (+853)", code: "MO" },
  { value: "+261", label: "Madagascar (+261)", code: "MG" },
  { value: "+265", label: "Malawi (+265)", code: "MW" },
  { value: "+960", label: "Maldives (+960)", code: "MV" },
  { value: "+223", label: "Mali (+223)", code: "ML" },
  { value: "+356", label: "Malta (+356)", code: "MT" },
  { value: "+692", label: "Marshall Islands (+692)", code: "MH" },
  { value: "+596", label: "Martinique (+596)", code: "MQ" },
  { value: "+222", label: "Mauritania (+222)", code: "MR" },
  { value: "+230", label: "Mauritius (+230)", code: "MU" },
  { value: "+691", label: "Micronesia (+691)", code: "FM" },
  { value: "+373", label: "Moldova (+373)", code: "MD" },
  { value: "+377", label: "Monaco (+377)", code: "MC" },
  { value: "+976", label: "Mongolia (+976)", code: "MN" },
  { value: "+382", label: "Montenegro (+382)", code: "ME" },
  { value: "+212", label: "Morocco (+212)", code: "MA" },
  { value: "+258", label: "Mozambique (+258)", code: "MZ" },
  { value: "+95", label: "Myanmar (+95)", code: "MM" },
  { value: "+264", label: "Namibia (+264)", code: "NA" },
  { value: "+674", label: "Nauru (+674)", code: "NR" },
  { value: "+687", label: "New Caledonia (+687)", code: "NC" },
  { value: "+505", label: "Nicaragua (+505)", code: "NI" },
  { value: "+227", label: "Niger (+227)", code: "NE" },
  { value: "+683", label: "Niue (+683)", code: "NU" },
  { value: "+672", label: "Norfolk Island (+672)", code: "NF" },
  { value: "+850", label: "North Korea (+850)", code: "KP" },
  { value: "+389", label: "North Macedonia (+389)", code: "MK" },
  { value: "+968", label: "Oman (+968)", code: "OM" },
  { value: "+680", label: "Palau (+680)", code: "PW" },
  { value: "+970", label: "Palestine (+970)", code: "PS" },
  { value: "+507", label: "Panama (+507)", code: "PA" },
  { value: "+675", label: "Papua New Guinea (+675)", code: "PG" },
  { value: "+595", label: "Paraguay (+595)", code: "PY" },
  { value: "+974", label: "Qatar (+974)", code: "QA" },
  { value: "+262", label: "Reunion (+262)", code: "RE" },
  { value: "+250", label: "Rwanda (+250)", code: "RW" },
  { value: "+685", label: "Samoa (+685)", code: "WS" },
  { value: "+378", label: "San Marino (+378)", code: "SM" },
  { value: "+239", label: "Sao Tome and Principe (+239)", code: "ST" },
  { value: "+221", label: "Senegal (+221)", code: "SN" },
  { value: "+381", label: "Serbia (+381)", code: "RS" },
  { value: "+248", label: "Seychelles (+248)", code: "SC" },
  { value: "+232", label: "Sierra Leone (+232)", code: "SL" },
  { value: "+421", label: "Slovakia (+421)", code: "SK" },
  { value: "+386", label: "Slovenia (+386)", code: "SI" },
  { value: "+677", label: "Solomon Islands (+677)", code: "SB" },
  { value: "+252", label: "Somalia (+252)", code: "SO" },
  { value: "+211", label: "South Sudan (+211)", code: "SS" },
  { value: "+290", label: "Saint Helena (+290)", code: "SH" },
  { value: "+508", label: "Saint Pierre and Miquelon (+508)", code: "PM" },
  { value: "+249", label: "Sudan (+249)", code: "SD" },
  { value: "+597", label: "Suriname (+597)", code: "SR" },
  { value: "+963", label: "Syria (+963)", code: "SY" },
  { value: "+886", label: "Taiwan (+886)", code: "TW" },
  { value: "+992", label: "Tajikistan (+992)", code: "TJ" },
  { value: "+255", label: "Tanzania (+255)", code: "TZ" },
  { value: "+670", label: "Timor-Leste (+670)", code: "TL" },
  { value: "+228", label: "Togo (+228)", code: "TG" },
  { value: "+690", label: "Tokelau (+690)", code: "TK" },
  { value: "+676", label: "Tonga (+676)", code: "TO" },
  { value: "+216", label: "Tunisia (+216)", code: "TN" },
  { value: "+993", label: "Turkmenistan (+993)", code: "TM" },
  { value: "+688", label: "Tuvalu (+688)", code: "TV" },
  { value: "+256", label: "Uganda (+256)", code: "UG" },
  { value: "+598", label: "Uruguay (+598)", code: "UY" },
  { value: "+998", label: "Uzbekistan (+998)", code: "UZ" },
  { value: "+678", label: "Vanuatu (+678)", code: "VU" },
  { value: "+681", label: "Wallis and Futuna (+681)", code: "WF" },
  { value: "+967", label: "Yemen (+967)", code: "YE" },
  { value: "+260", label: "Zambia (+260)", code: "ZM" },
  { value: "+263", label: "Zimbabwe (+263)", code: "ZW" },
]

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value?: string
  onChange?: (value: string) => void
}

export function PhoneInput({ className, value = "", onChange, ...props }: PhoneInputProps) {
  const [open, setOpen] = React.useState(false)

  // Parse existing value (e.g., "+91 9876543210")
  const defaultCountry = "+91"
  let initialCode = defaultCountry
  let initialNumber = ""

  if (value) {
    // If the value contains a space, split by the first space
    if (value.includes(" ")) {
      const parts = value.split(" ")
      initialCode = parts[0]
      initialNumber = parts.slice(1).join(" ") // in case there are other spaces
    } else {
      // Best effort match for existing values without space
      const matched = COUNTRY_CODES.find(c => value.startsWith(c.value))
      if (matched) {
        initialCode = matched.value
        initialNumber = value.slice(matched.value.length).trim()
      } else {
        // If it doesn't match a known country code and has no space, treat whole as number
        initialNumber = value
      }
    }
  }

  const [countryCode, setCountryCode] = React.useState(initialCode)
  const [phoneNumber, setPhoneNumber] = React.useState(initialNumber)

  // Keep internal state synced if external value changes completely
  React.useEffect(() => {
    if (value) {
      if (value.includes(" ")) {
        const parts = value.split(" ")
        setCountryCode(parts[0])
        setPhoneNumber(parts.slice(1).join(" "))
      } else {
        const matched = COUNTRY_CODES.find(c => value.startsWith(c.value))
        if (matched) {
          setCountryCode(matched.value)
          setPhoneNumber(value.slice(matched.value.length).trim())
        }
      }
    } else {
      setPhoneNumber("")
    }
  }, [value])

  const notifyChange = (code: string, number: string) => {
    if (onChange) {
      if (!number) {
        onChange("")
      } else {
        onChange(`${code} ${number}`)
      }
    }
  }

  // 10 digits for India, up to 14 for other countries
  const maxDigits = maxPhoneDigits(countryCode)

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers
    const newNumber = e.target.value.replace(/\D/g, '')
    // Limit to the country's length; a longer number can still be shortened
    if (newNumber.length <= maxDigits || newNumber.length < phoneNumber.length) {
      setPhoneNumber(newNumber)
      notifyChange(countryCode, newNumber)
    }
  }

  return (
    <div className={cn("flex w-full space-x-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[96px] justify-between h-9 px-2 shrink-0"
          >
            <span className="truncate flex-1 text-left text-sm">{countryCode}</span>
            <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandInput placeholder="Search country..." />
            <CommandList>
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup>
                {COUNTRY_CODES.map((country) => (
                  <CommandItem
                    key={country.value}
                    value={`${country.label} ${country.value}`}
                    onSelect={() => {
                      setCountryCode(country.value)
                      setOpen(false)
                      notifyChange(country.value, phoneNumber)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        countryCode === country.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {country.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Input
        type="tel"
        placeholder={countryCode === "+91" ? "10 digits" : "Phone number"}
        {...props}
        value={phoneNumber}
        onChange={handlePhoneChange}
        className="flex-1 min-w-0 h-9 px-2 text-sm placeholder:text-xs"
        maxLength={maxDigits}
      />
    </div>
  )
}
