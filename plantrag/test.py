import os
import json
import random
import time
import re
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig, pipeline
from tqdm.auto import tqdm
# from kaggle_secrets import UserSecretsClient # Uncomment if you set up HF_TOKEN as a Kaggle Secret

# --- Configuration ---
MODEL_ID = "meta-llama/Meta-Llama-3.1-8B-Instruct"
# Ensure this path is correct and points to your final augmented list from the previous steps
PLANT_LIST_FILE_PATH = "/kaggle/working/master_list_AUGMENTED_linked_final.json" 
MAX_TOTAL_SENTENCES = 3500 
OUTPUT_FILE = "/kaggle/working/stage1_generated_sentences_L31_v2.jsonl"
BATCH_SIZE = 2 # START WITH 1 or 2 for Llama-3.1-8B 4-bit on P100 to avoid OOM. Increase if stable.
MAX_PROMPT_LENGTH = 512 
MAX_NEW_TOKENS = 120   # Max tokens for LLM to generate for *each sentence*. Adjusted.
MIN_NEW_TOKENS = 15
TEMPERATURE = 0.7
TOP_P = 0.9
DO_SAMPLE = True
REPETITION_PENALTY = 1.1
NUM_SENTENCES_PER_PLANT_MAX = 6 # Reduced slightly to balance with more variations

# --- Hugging Face Token ---
# Define placeholder constant
HF_TOKEN_PLACEHOLDER = "YOUR_HF_TOKEN_HERE"
# OPTION 1: Set directly - Less secure if sharing notebook
HF_TOKEN = "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" 
# OPTION 2: Use Kaggle Secrets (RECOMMENDED)
# try:
#     user_secrets = UserSecretsClient()
#     HF_TOKEN = user_secrets.get_secret("HF_TOKEN") # Ensure your secret is named "HF_TOKEN"
#     print("[INFO] Successfully loaded HF_TOKEN from Kaggle Secrets.")
# except Exception as e:
#     HF_TOKEN = None # Fallback
#     print(f"[INFO] Could not load HF_TOKEN from Kaggle Secrets: {e}. Will proceed without explicit token.")
#     print("[INFO] If the model is gated (like Llama 3), this will likely fail. Please ensure HF_TOKEN is correctly set up.")

# --- Global LLM variables ---
tokenizer_global = None
model_global = None
llm_pipeline = None # Using Hugging Face pipeline object

# --- Helper: Load Plant List (for new structured list) ---
def load_plant_list(filepath):
    plants_to_process = []
    if not os.path.exists(filepath):
        print(f"[ERROR] Plant list file not found: {filepath}")
        return []
    if not filepath.endswith(".json"):
        print(f"[ERROR] Expected a .json file for plant list, got: {filepath}")
        return []
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
            if not isinstance(data, list):
                print(f"[ERROR] Expected JSON list, got type: {type(data)}")
                return []
            
            for item_idx, item in enumerate(data):
                if not isinstance(item, dict):
                    print(f"[WARNING] Skipping non-dict item in plant list: {item}")
                    continue

                plant_id = item.get("plant_id", f"unknown_id_{item_idx}")
                scientific_name = item.get("scientific_name")
                common_names_list = item.get("common_names", [])

                if not isinstance(common_names_list, list): # Ensure it's a list
                    common_names_list = [str(common_names_list)] if common_names_list else []
                
                # Filter out non-string or empty common names
                common_names_list = [cn for cn in common_names_list if isinstance(cn, str) and cn.strip()]

                current_scientific_name = scientific_name.strip() if scientific_name and isinstance(scientific_name, str) and scientific_name.strip() else None
                
                if not current_scientific_name and not common_names_list:
                    # print(f"[DEBUG] Plant ID '{plant_id}' has no usable scientific or common names. Original item: {item}. Skipping.")
                    continue
                
                plants_to_process.append({
                    "plant_id": plant_id,
                    "scientific_name": current_scientific_name,
                    "common_names": common_names_list
                })
                
        print(f"[INFO] Loaded {len(plants_to_process)} valid plants from structured JSON file {filepath}")
        if not plants_to_process: print("[ERROR] No plant data loaded or processed correctly.")
        return plants_to_process
        
    except FileNotFoundError: 
        print(f"[ERROR] Plant list JSON file not found: {filepath}"); return []
    except json.JSONDecodeError as e: 
        print(f"[ERROR] Error decoding JSON from {filepath}: {e}"); return []
    except Exception as e: 
        print(f"[ERROR] An unexpected error occurred loading plant list: {e}");
        import traceback
        traceback.print_exc()
        return []


# --- LLM Setup (Updated for BitsAndBytesConfig and Llama 3) ---
def setup_llm():
    global tokenizer_global, model_global, llm_pipeline, HF_TOKEN # Added HF_TOKEN here

    if llm_pipeline: # Check if pipeline is already set up
        print("[INFO] LLM pipeline already set up.")
        return True

    if HF_TOKEN == "YOUR_HF_TOKEN_HERE" or HF_TOKEN is None:
         print("[WARNING] HF_TOKEN is not set or is a placeholder. Model loading might fail if it's a gated model like Llama 3.")
         print("          Please set your actual Hugging Face token or use Kaggle Secrets.")
         # You might want to make this a hard stop if token is essential:
         # return False 

    print(f"[INFO] Setting up LLM: {MODEL_ID}")
    
    compute_dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
    print(f"[INFO] Using compute_dtype: {compute_dtype}")

    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True, 
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=compute_dtype, 
        bnb_4bit_use_double_quant=True,
    )
    
    try:
        tokenizer_global = AutoTokenizer.from_pretrained(MODEL_ID, token=HF_TOKEN) # Use token=
        
        model_global = AutoModelForCausalLM.from_pretrained(
            MODEL_ID,
            quantization_config=bnb_config,
            device_map="auto",
            token=HF_TOKEN # Use token=
        )
        
        if tokenizer_global.pad_token_id is None:
            print("[INFO] tokenizer.pad_token_id is None. Setting pad_token_id to eos_token_id.")
            tokenizer_global.pad_token_id = tokenizer_global.eos_token_id
        # For decoder-only models like Llama, padding side is typically 'left' for training,
        # but for generation, 'right' (default) is often fine with attention masks.
        # If issues arise, explicitly set: tokenizer_global.padding_side = "left"

        print(f"[INFO] LLM model and tokenizer loaded successfully.")
        
        print("[INFO] Creating text generation pipeline...")
        llm_pipeline = pipeline(
            "text-generation",
            model=model_global,
            tokenizer=tokenizer_global,
            device_map="auto", # Redundant if model already device_map'd but good practice
        )
        print("[INFO] LLM Pipeline initialized successfully.")
        return True
    except ImportError as e:
        print(f"[CRITICAL ERROR] ImportError during LLM setup: {e}")
        print("This often means 'bitsandbytes' is not installed correctly or the kernel was not restarted after installation.")
        print("Please ensure you have run: !pip install bitsandbytes accelerate")
        print("And then RESTARTED THE KERNEL via the Kaggle menu.")
        import traceback
        traceback.print_exc()
        return False
    except Exception as e:
        print(f"[CRITICAL ERROR] Failed to load LLM: {e}")
        import traceback
        traceback.print_exc()
        return False


# --- Prompt Formatting for Llama 3 Instruct ---
def format_prompt_llama3_instruct(system_message, user_message):
    global tokenizer_global
    if tokenizer_global is None:
        # This case should ideally be prevented by setup_llm() failing gracefully.
        print("[ERROR] Tokenizer not initialized for prompt formatting.")
        # Attempt to initialize here as a fallback, though it's better if setup_llm handles it.
        if not setup_llm():
             raise ValueError("Tokenizer initialization failed.")
    
    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": user_message},
    ]
    # The tokenizer's apply_chat_template handles special tokens like <|begin_of_text|> and <|eot_id|>
    # add_generation_prompt=True appends the tokens that signal the start of the assistant's turn
    return tokenizer_global.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)

# --- Sentence Generation Logic (using pipeline) ---
def generate_batch_with_llm(formatted_prompts_batch):
    global llm_pipeline, tokenizer_global # Added tokenizer_global for eos_token_id access
    if not llm_pipeline:
        print("[ERROR] LLM pipeline not initialized for generation.")
        return [None] * len(formatted_prompts_batch)

    try:
        # Llama 3 uses specific EOT tokens. The pipeline should handle this by default if eos_token_id is set on tokenizer.
        # For more control, one can pass a list of terminators.
        terminators = [
            tokenizer_global.eos_token_id,
            tokenizer_global.convert_tokens_to_ids("<|eot_id|>") 
        ]

        outputs = llm_pipeline(
            formatted_prompts_batch,
            max_new_tokens=MAX_NEW_TOKENS,
            min_new_tokens=MIN_NEW_TOKENS,
            do_sample=DO_SAMPLE,
            temperature=TEMPERATURE,
            top_p=TOP_P,
            repetition_penalty=REPETITION_PENALTY,
            pad_token_id=tokenizer_global.pad_token_id, # Ensure pipeline uses this
            eos_token_id=terminators, # Tell it when to stop
            num_return_sequences=1
        )
        # The pipeline output for "text-generation" is usually List[List[Dict[str, str]]]
        # Each inner list contains dicts for num_return_sequences. We have 1.
        # Each dict has 'generated_text' which INCLUDES THE PROMPT for instruct/chat models.
        
        generated_responses_only = []
        for i, full_response_dict_list in enumerate(outputs):
            full_generated_text = full_response_dict_list[0]['generated_text']
            original_prompt_string = formatted_prompts_batch[i] # The fully formatted prompt we sent

            # Strip the prompt from the response
            response_text_only = full_generated_text
            if full_generated_text.startswith(original_prompt_string):
                response_text_only = full_generated_text[len(original_prompt_string):].strip()
            else:
                # Fallback if prompt isn't exactly at the start (e.g., due to special tokens not in string)
                assistant_marker = "<|start_header_id|>assistant<|end_header_id|>" # Stop before this prints
                if assistant_marker in full_generated_text:
                     parts = full_generated_text.split(assistant_marker)
                     if len(parts) > 1:
                         response_text_only = parts[-1].strip()
                else:
                     print(f"    [WARNING] Prompt not found at start of LLM output for prompt {i}, and assistant marker not found. Using full output for cleaning.")
            
            # Additional cleanup for any trailing EOT tokens if not handled by skip_special_tokens
            final_eot_marker = tokenizer_global.decode(tokenizer_global.convert_tokens_to_ids("<|eot_id|>"), skip_special_tokens=False)
            if response_text_only.endswith(final_eot_marker):
                response_text_only = response_text_only[:-len(final_eot_marker)].strip()
            if response_text_only.endswith(tokenizer_global.eos_token):
                 response_text_only = response_text_only[:-len(tokenizer_global.eos_token)].strip()

            generated_responses_only.append(response_text_only)
            
        return generated_responses_only

    except Exception as e:
        print(f"  LLM batch generation error: {e}")
        import traceback
        traceback.print_exc()
        return [None] * len(formatted_prompts_batch)


# --- Sophisticated Prompt Creation ---
def create_sophisticated_prompt(plant_name_to_use, variation_type_info, plant_display_name_for_context):
    sentence_structures = [
        "question_about_problem", "care_tip", "identification_detail",
        "environmental_need", "general_fact", "propagation_info",
        "seasonal_advice", "question_about_appearance"
    ]
    chosen_structure = random.choice(sentence_structures)

    length_hints = ["a concise sentence", "a clear sentence", "a slightly more detailed sentence", "one informative sentence"]
    length_hint = random.choice(length_hints)
    prompt_instruction = f"Compose {length_hint}"

    # Using f-strings for cleaner concatenation
    if chosen_structure == "question_about_problem":
        problem_examples = ["yellowing leaves", "wilting", "pest infestation", "stunted growth", "not flowering", "leaf drop", "root rot symptoms"]
        problem = random.choice(problem_examples)
        prompt_instruction += f" asking about why their \"{plant_name_to_use}\" might be experiencing {problem}."
    elif chosen_structure == "care_tip":
        care_aspects = ["watering frequency", "soil mixture composition", "fertilizing schedule or type", "pruning technique for health", "ideal humidity requirements", "light exposure needs"]
        aspect = random.choice(care_aspects)
        prompt_instruction += f" providing a key care tip about the {aspect} specifically for \"{plant_name_to_use}\"."
    elif chosen_structure == "identification_detail":
        id_features = ["unique leaf shape or coloration", "distinctive flower appearance or scent", "characteristic growth habit (e.g., vining, bushy)", "notable stem or bark texture", "specific root system feature (if commonly known and simple)"]
        feature = random.choice(id_features)
        prompt_instruction += f" describing a distinctive physical detail about the {feature} of \"{plant_name_to_use}\" that aids in its identification."
    elif chosen_structure == "environmental_need":
        env_factors = ["ideal light exposure (e.g., 'bright indirect light', 'full sun')", "preferred temperature range (e.g., '65-75°F' or '18-24°C')", "its native climate or region of origin", "suitability for indoor vs. outdoor growing conditions"]
        factor = random.choice(env_factors)
        prompt_instruction += f" about the {factor} for the plant \"{plant_name_to_use}\"."
    elif chosen_structure == "general_fact":
        fact_types = ["its typical lifespan or size", "a common culinary or medicinal use (if applicable)", "an interesting historical fact or cultural significance", "its botanical family (if simple and widely known)"]
        fact_type = random.choice(fact_types)
        prompt_instruction += f" stating a general botanical fact about \"{plant_name_to_use}\" concerning {fact_type}."
    elif chosen_structure == "propagation_info":
        prop_methods = ["stem cuttings", "division", "seeds", "leaf cuttings (if applicable)"]
        method = random.choice(prop_methods)
        prompt_instruction += f" that gives advice on how to successfully propagate \"{plant_name_to_use}\" using the {method} method."
    elif chosen_structure == "seasonal_advice":
        seasons = ["spring", "summer", "autumn", "winter"]
        season = random.choice(seasons)
        prompt_instruction += f" offering a specific seasonal care adjustment for \"{plant_name_to_use}\" during the {season} season."
    elif chosen_structure == "question_about_appearance":
        appearance_queries = ["unusual leaf curling", "unexpected spots on its petals", "if its current growth rate or size is normal for its age", "how to encourage more vibrant coloration in its foliage or flowers"]
        query = random.choice(appearance_queries)
        prompt_instruction += f" posing a question a gardener might ask about the appearance of their \"{plant_name_to_use}\", specifically about {query}."
    
    full_user_prompt = f"{prompt_instruction} The sentence MUST include the plant name \"{plant_name_to_use}\". Ensure the sentence is grammatically correct, sounds natural, and is relevant to plant enthusiasts or gardeners. Directly output ONLY the single sentence. Do not include any preambles, greetings, or conversational turns."
    return full_user_prompt


# --- Filter and Clean Sentence (Enhanced for Llama 3) ---
def filter_and_clean_sentence(sentence_text, plant_name_in_prompt):
    if not sentence_text or not isinstance(sentence_text, str) or len(sentence_text.split()) < 3: # Min 3 words now
        return None

    # Llama 3 specific end-of-turn token might appear if not fully stripped by pipeline
    if "<|eot_id|>" in sentence_text:
        sentence_text = sentence_text.split("<|eot_id|>")[0].strip()
    # If the model starts a new turn (unlikely if we asked for single sentence but possible)
    if "<|start_header_id|>" in sentence_text: 
        sentence_text = sentence_text.split("<|start_header_id|>")[0].strip()

    # Remove common LLM preambles (more aggressive)
    preambles_patterns = [
    re.compile(r"^\s*(okay|sure|certainly|alright|great|fine|yes|no problem|here['’]?s|here you go|here is|I'd be happy to|happy to help|I can help with that|as requested|certainly, here is a sentence)[\s,!\.]*([^a-zA-Z0-9\(\"“]*)(?:a sentence|one sentence|an example|the sentence(?: you requested)?|your sentence|the following sentence|that for you)?(?: for the plant \"?[^\"]+\"?)?(?: about .*?)?[:\- ]*\s*", re.IGNORECASE),
    re.compile(r"^\s*Here['']?s one(?: such)? sentence:?\s*", re.IGNORECASE),
    re.compile(r"^\s*\""), # Leading quote
    re.compile(r"^\s*\u201c"), # Leading fancy quote (escaped Unicode for left double quote)
    re.compile(r"^\s*-\s*"), # Leading dash
    re.compile(r"^\s*Okay\s*,\s*here\s*is\s*a\s*sentence\s*about\s*\"?[^\"]+\"?\s*:", re.IGNORECASE),
    ]
    for pattern in preambles_patterns:
        sentence_text = pattern.sub("", sentence_text).strip()
    
    # Remove trailing conversational closers or self-references
    postambles_patterns = [
        re.compile(r"Is there anything else I can help you with(?: today)?\??$", re.IGNORECASE),
        re.compile(r"I hope this helps!?$", re.IGNORECASE),
        re.compile(r"Let me know if you need more sentences!?$", re.IGNORECASE),
        re.compile(r"\s*\"$", re.IGNORECASE), # Trailing quote
        re.compile(r"\s*\u201d$", re.IGNORECASE), 
    ]
    for pattern in postambles_patterns:
        sentence_text = pattern.sub("", sentence_text).strip()

    lines = sentence_text.split('\n')
    first_meaningful_line = ""
    for line in lines:
        stripped_line = line.strip()
        # Skip lines that look like list items if they are short and the only content
        if re.match(r"^\s*[\*\-\•\d]\.?\s+", stripped_line) and len(stripped_line.split()) < 4:
            continue
        if stripped_line: 
            first_meaningful_line = stripped_line
            break
    sentence_text = first_meaningful_line

    if not sentence_text or len(sentence_text.split()) < 3:
        # print(f"[FILTER] Sentence too short after cleaning: '{original_sentence_for_debug}' -> '{sentence_text}'")
        return None

    plant_name_lower = plant_name_in_prompt.lower()
    # If plant_name_in_prompt was "Common (Scientific)", check for common first for higher likelihood.
    primary_name_to_check = plant_name_lower
    if "(" in plant_name_lower and ")" in plant_name_lower:
        primary_name_to_check = plant_name_lower.split("(",1)[0].strip()

    sentence_lower = sentence_text.lower()
    name_present = False
    if primary_name_to_check in sentence_lower:
        name_present = True
    else: # If primary part not found, check full original prompt name
        if plant_name_lower in sentence_lower:
             name_present = True
        else: # Fallback to checking parts for multi-word names
            name_parts = [p for p in plant_name_lower.replace('(','').replace(')','').split() if len(p) > 2] 
            if name_parts:
                for part in name_parts:
                    if part in sentence_lower:
                        name_present = True
                        break
    
    if not name_present:
        # print(f"[FILTER] Plant name '{plant_name_in_prompt}' not sufficiently found in: \"{sentence_text}\"")
        return None

    if not re.search(r"[.!?]$", sentence_text):
        sentence_text += "."
        
    disclaimer_patterns = [
        r"\b(as an AI|I cannot|I am unable to|my knowledge cut-off|I am a language model|I'm just an AI|I'm an AI language model)\b",
        r"\b(this sentence is an example|example sentence for you|I hope this is helpful|feel free to ask|here is a sentence for you)\b"
    ]
    for pattern in disclaimer_patterns:
        if re.search(pattern, sentence_text, re.IGNORECASE):
            # print(f"[FILTER] Sentence contains AI disclaimer: \"{sentence_text}\"")
            return None

    instruction_fragments = [ # Made more specific to avoid false positives
        "generate a sentence about", "compose a sentence about", "create a sentence about", "provide a sentence about",
        "write a sentence for", "here is the sentence for", "a sentence for your dataset"
    ]
    for frag in instruction_fragments:
        if frag in sentence_text.lower():
            # print(f"[FILTER] Sentence seems to restate prompt: \"{sentence_text}\"")
            return None

    if len(sentence_text.split()) < 4: # Final check after all cleaning
        # print(f"[FILTER] Final length too short: \"{sentence_text}\"")
        return None
        
    sentence_text = sentence_text.strip().lstrip('- ').strip() # Remove leading list-like markers too
    sentence_text = sentence_text.strip('"').strip("'").strip()

    # Check if the sentence starts or ends with the plant name itself and nothing else substantial
    if sentence_text.lower() == plant_name_in_prompt.lower() or \
       sentence_text.lower() == plant_name_in_prompt.lower() + ".":
        # print(f"[FILTER] Sentence is just the plant name: \"{sentence_text}\"")
        return None
        
    return sentence_text


# --- Main Generation Loop ---
def main():
    if not torch.cuda.is_available():
        print("[CRITICAL] CUDA is not available. This script needs a GPU. Exiting.")
        return

    if not setup_llm():
        print("[CRITICAL] LLM setup failed. Exiting.")
        return
    
    plant_master_list_structured = load_plant_list(PLANT_LIST_FILE_PATH)
    if not plant_master_list_structured: 
        print("[CRITICAL] Failed to load or process plant master list. Exiting.")
        return

    # --- Resume Logic ---
    temp_generated_data_holder = []
    existing_output_keys = set() # Store (plant_id, variation_type_detail, prompted_plant_name) to avoid re-adding
    if os.path.exists(OUTPUT_FILE):
        print(f"[INFO] Output file {OUTPUT_FILE} exists. Loading existing data to append new unique sentences.")
        try:
            with open(OUTPUT_FILE, 'r', encoding='utf-8') as f_existing:
                for line_idx, line in enumerate(f_existing):
                    try:
                        entry = json.loads(line)
                        temp_generated_data_holder.append(entry)
                        key = (entry.get("plant_id"), entry.get("variation_type_detail"), entry.get("prompted_plant_name"))
                        if all(k is not None for k in key): # Ensure all parts of key are present
                           existing_output_keys.add(key)
                    except json.JSONDecodeError:
                        print(f"  Skipping malformed line {line_idx+1} from existing output: {line.strip()}")
            print(f"[INFO] Loaded {len(temp_generated_data_holder)} existing sentences. Found {len(existing_output_keys)} unique existing entries for resume.")
        except Exception as e:
            print(f"[ERROR] Could not load existing output file {OUTPUT_FILE}: {e}. Starting with an empty list.")
            temp_generated_data_holder = []
            existing_output_keys = set()
    # --- End Resume Logic ---

    all_prompts_to_generate_info = []
    for plant_entry in plant_master_list_structured:
        plant_id = plant_entry["plant_id"]
        sci_name = plant_entry["scientific_name"]
        common_names = plant_entry.get("common_names", []) # Ensure it's a list

        variations_for_this_plant = []
        # Prioritize specific names if available
        if sci_name:
            variations_for_this_plant.append({
                "name_to_use": sci_name, 
                "type_info": "scientific_name_query", 
                "original_display_for_prompt": sci_name # Use this for the prompt
            })
        
        if common_names:
            primary_common_name = common_names[0]
            variations_for_this_plant.append({
                "name_to_use": primary_common_name, 
                "type_info": "common_name_query", 
                "original_display_for_prompt": primary_common_name
            })
            if sci_name: 
                 variations_for_this_plant.append({
                     "name_to_use": f"{primary_common_name} (scientific name: {sci_name})", 
                     "type_info": "common_and_scientific_query", 
                     "original_display_for_prompt": f"{primary_common_name} / {sci_name}"
                 })
        
        if not variations_for_this_plant: # Fallback if only one type was null but the other existed
            if sci_name:
                variations_for_this_plant.append({"name_to_use": sci_name, "type_info": "fallback_sci", "original_display_for_prompt": sci_name})
            elif common_names:
                 variations_for_this_plant.append({"name_to_use": common_names[0], "type_info": "fallback_common", "original_display_for_prompt": common_names[0]})
            else:
                continue # Should have been caught by load_plant_list

        num_prompts_per_base_name = max(1, NUM_SENTENCES_PER_PLANT_MAX // len(variations_for_this_plant) if variations_for_this_plant else 1)

        for variation_details in variations_for_this_plant:
            for _ in range(num_prompts_per_base_name): # Create N prompts for each variation
                # Check if this specific combination has already been generated and loaded
                resume_key = (plant_id, variation_details["type_info"], variation_details["name_to_use"])
                if resume_key in existing_output_keys and len(temp_generated_data_holder) < MAX_TOTAL_SENTENCES : # Only skip if we are truly resuming and not just filling up to MAX
                    # This check is tricky with random prompts. Simpler to deduplicate at the end or check generated_sentence.
                    pass
                
                if len(temp_generated_data_holder) + len(all_prompts_to_generate_info) >= MAX_TOTAL_SENTENCES * 1.2: # Generate a slight surplus for filtering
                    break

                user_prompt_content = create_sophisticated_prompt(
                    variation_details["name_to_use"], 
                    variation_details["type_info"], # Pass the more descriptive type
                    variation_details["original_display_for_prompt"]
                )
                all_prompts_to_generate_info.append({
                    "prompt_text": user_prompt_content,
                    "plant_id": plant_id,
                    "prompted_plant_name": variation_details["name_to_use"],
                    "original_scientific_name": sci_name, # For output record
                    "original_common_names": common_names, # For output record
                    "variation_type_detail": variation_details["type_info"]
                })
            if len(temp_generated_data_holder) + len(all_prompts_to_generate_info) >= MAX_TOTAL_SENTENCES * 1.2: break
        if len(temp_generated_data_holder) + len(all_prompts_to_generate_info) >= MAX_TOTAL_SENTENCES * 1.2: break
    
    print(f"[INFO] Total prompts prepared to potentially generate up to target: {len(all_prompts_to_generate_info)}")
    random.shuffle(all_prompts_to_generate_info)

sentences_generated_this_run = 0
needed_sentences = MAX_TOTAL_SENTENCES - len(temp_generated_data_holder)

with tqdm(total=max(0, needed_sentences), desc="Generating Sentences") as pbar:
    for i in range(0, len(all_prompts_to_generate_info), BATCH_SIZE):
        batch = all_prompts_to_generate_info[i:i + BATCH_SIZE]
        batch_prompts = [item['prompt_text'] for item in batch]
        
        formatted_batch = [
            format_prompt_llama3_instruct(
                "You are a knowledgeable botanist.",
                prompt
            ) for prompt in batch_prompts
        ]
        
        responses = generate_batch_with_llm(formatted_batch)
        
        for idx, response in enumerate(responses):
            if not response: continue
                
            cleaned_sentence = filter_and_clean_sentence(
                response, 
                batch[idx]['prompted_plant_name']
            )
            
            if cleaned_sentence:
                entry = {
                    "sentence": cleaned_sentence,
                    "plant_id": batch[idx]["plant_id"],
                    "prompted_plant_name": batch[idx]["prompted_plant_name"],
                    "original_scientific_name": batch[idx]["original_scientific_name"],
                    "original_common_names": batch[idx]["original_common_names"],
                    "variation_type_detail": batch[idx]["variation_type_detail"],
                    "prompt_text_used": batch[idx]["prompt_text"],
                    "model_id": MODEL_ID,
                    "generated_at": time.strftime("%Y-%m-%d %H:%M:%S")
                }
                
                temp_generated_data_holder.append(entry)
                sentences_generated_this_run += 1
                
                pbar.update(1)
                
                if len(temp_generated_data_holder) >= MAX_TOTAL_SENTENCES:
                    print(f"[INFO] Reached target of {MAX_TOTAL_SENTENCES} sentences. Stopping.")
                    break
        
        if len(temp_generated_data_holder) >= MAX_TOTAL_SENTENCES:
            break

    try:
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f_out:
            for entry in temp_generated_data_holder[:MAX_TOTAL_SENTENCES]:
                f_out.write(json.dumps(entry) + '\n')
        print(f"[INFO] Successfully saved {len(temp_generated_data_holder[:MAX_TOTAL_SENTENCES])} sentences to {OUTPUT_FILE}")
    except Exception as e:
        print(f"[ERROR] Failed to save final output to {OUTPUT_FILE}: {e}")
        try:
            with open(OUTPUT_FILE + ".partial", 'w', encoding='utf-8') as f_out:
                for entry in temp_generated_data_holder[:MAX_TOTAL_SENTENCES]:
                    f_out.write(json.dumps(entry) + '\n')
            print(f"[INFO] Saved partial results to {OUTPUT_FILE}.partial")
        except Exception as e2:
            print(f"[ERROR] Failed to save partial results: {e2}")

if __name__ == "__main__":
    print("[INFO] Starting plant sentence generation script...")
    main()
    print("[INFO] Script completed.")