from sentence_transformers import SentenceTransformer
import sys
import json

def generate_vector(text):
    # Initialize the model (same as in the Python project)
    model = SentenceTransformer('all-MiniLM-L6-v2')
    
    # Generate vector
    vector = model.encode([text])[0]
    
    # Convert to list and return as JSON
    return json.dumps(vector.tolist())

if __name__ == "__main__":
    # Get input text from command line argument
    if len(sys.argv) < 2:
        print("Please provide text as an argument")
        sys.exit(1)
        
    text = sys.argv[1]
    
    try:
        # Generate and print vector
        print(generate_vector(text))
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)
