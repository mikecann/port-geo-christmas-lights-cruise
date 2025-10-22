import { useState, useEffect, useRef } from "react";
import { Combobox, TextInput, useCombobox, ScrollArea } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";

interface AddressSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (value: { address: string; placeId: string }) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string | null;
  disabled?: boolean;
}

// Helper function to load Google Maps API
const loadGoogleMapsAPI = async (): Promise<boolean> => {
  if (typeof google !== "undefined" && google.maps) return true;

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error(
      "VITE_GOOGLE_MAPS_API_KEY not found in environment variables",
    );
    return false;
  }

  try {
    // Load the Google Maps API script if not already loaded
    if (!window.google) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;

      const loadPromise = new Promise<boolean>((resolve, reject) => {
        script.onload = () => resolve(true);
        script.onerror = () => reject(false);
      });

      document.head.appendChild(script);
      return await loadPromise;
    }
    return true;
  } catch (error) {
    console.error("Failed to load Google Maps API:", error);
    return false;
  }
};

// Search function using the new AutocompleteSuggestion API
const searchAddresses = async (query: string): Promise<AddressSuggestion[]> => {
  if (!query.trim() || query.length < 3) return [];

  try {
    // Load the Places library
    const { AutocompleteSuggestion } = (await google.maps.importLibrary(
      "places",
    )) as google.maps.PlacesLibrary;

    const { suggestions } =
      await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: query,
        // Restrict to Australia like your backend does
        includedRegionCodes: ["AU"],
        // Bias towards Port Geographe area specifically
        locationBias: new google.maps.LatLngBounds(
          new google.maps.LatLng(-33.64, 115.3), // Southwest corner
          new google.maps.LatLng(-33.61, 115.33), // Northeast corner
        ),
      });

    // Filter and format results - similar to your backend filtering logic
    return suggestions
      .map((suggestion) => suggestion.placePrediction)
      .filter((prediction): prediction is NonNullable<typeof prediction> => {
        if (!prediction) return false;
        const types = prediction.types || [];
        // Keep predictions that are street addresses or postal codes
        if (types.includes("street_address") || types.includes("postal_code"))
          return true;

        // For geocode types, check for building numbers (premise/subpremise)
        if (types.includes("geocode"))
          return types.some((type) => ["premise", "subpremise"].includes(type));

        return false;
      })
      .map((prediction) => ({
        placeId: prediction.placeId,
        description: prediction.text?.text || "",
        mainText: prediction.mainText?.text || "",
        secondaryText: prediction.secondaryText?.text || "",
      }))
      .slice(0, 8); // Limit to 8 suggestions to keep UI clean
  } catch (error) {
    console.error("Address search failed:", error);
    return [];
  }
};

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  label = "House Address",
  placeholder = "Enter your house address",
  required = false,
  error = null,
  disabled = false,
}: AddressAutocompleteProps) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const [isAPILoaded, setIsAPILoaded] = useState(false);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debouncedValue] = useDebouncedValue(value, 300);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load Google Maps API on component mount
  useEffect(() => {
    const initAPI = async () => {
      const loaded = await loadGoogleMapsAPI();
      setIsAPILoaded(loaded);
    };
    initAPI();
  }, []);

  // Search for addresses when debounced value changes
  useEffect(() => {
    const searchForAddresses = async (searchQuery: string) => {
      if (!isAPILoaded || !searchQuery.trim()) {
        setSuggestions([]);
        return;
      }

      // Cancel previous request
      if (abortControllerRef.current) abortControllerRef.current.abort();

      abortControllerRef.current = new AbortController();

      setIsLoading(true);
      try {
        const results = await searchAddresses(searchQuery);
        setSuggestions(results);
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Address search error:", error);
          setSuggestions([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    searchForAddresses(debouncedValue);
  }, [debouncedValue, isAPILoaded]);

  const options = suggestions.map((suggestion) => (
    <Combobox.Option value={suggestion.placeId} key={suggestion.placeId}>
      <div>
        <div style={{ fontWeight: 500 }}>{suggestion.mainText}</div>
        {suggestion.secondaryText && (
          <div
            style={{
              fontSize: "0.875rem",
              color: "var(--mantine-color-dimmed)",
            }}
          >
            {suggestion.secondaryText}
          </div>
        )}
      </div>
    </Combobox.Option>
  ));

  if (!isAPILoaded)
    // Fallback to regular TextInput if API fails to load
    return (
      <TextInput
        label={label}
        placeholder={placeholder}
        required={required}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        error={error}
        disabled={disabled}
      />
    );

  return (
    <Combobox
      store={combobox}
      withinPortal={false}
      onOptionSubmit={(val) => {
        const suggestion = suggestions.find((s) => s.placeId === val);
        if (!suggestion) return;
        onChange(suggestion.description);
        if (onSelect)
          onSelect({
            address: suggestion.description,
            placeId: suggestion.placeId,
          });
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <TextInput
          label={label}
          placeholder={placeholder}
          required={required}
          value={value}
          onChange={(event) => {
            onChange(event.currentTarget.value);
            combobox.openDropdown();
            combobox.updateSelectedOptionIndex();
          }}
          onClick={() => combobox.openDropdown()}
          onFocus={() => combobox.openDropdown()}
          onBlur={() => combobox.closeDropdown()}
          error={error}
          disabled={disabled}
          rightSection={
            isLoading && (
              <div
                style={{
                  width: 16,
                  height: 16,
                  border: "2px solid #e9ecef",
                  borderTop: "2px solid #495057",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
            )
          }
        />
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>
          <ScrollArea.Autosize mah={200} type="scroll">
            {options.length > 0 ? (
              options
            ) : (
              <Combobox.Empty>
                {isLoading
                  ? "Searching..."
                  : value.trim().length < 3
                    ? "Type at least 3 characters"
                    : "No addresses found"}
              </Combobox.Empty>
            )}
          </ScrollArea.Autosize>
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
