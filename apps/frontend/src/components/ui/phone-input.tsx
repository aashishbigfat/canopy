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

// Comprehensive list of important country codes
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
  { value: "+7", label: "Russia (+7)", code: "RU" },
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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers
    const newNumber = e.target.value.replace(/\D/g, '')
    // Limit to 10 digits
    if (newNumber.length <= 10) {
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
            className="w-[85px] justify-between h-9 bg-white px-2 shrink-0"
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
        placeholder="10 digits"
        {...props}
        value={phoneNumber}
        onChange={handlePhoneChange}
        className="flex-1 min-w-0 h-9 bg-white px-2 text-sm placeholder:text-xs"
        maxLength={10}
      />
    </div>
  )
}
