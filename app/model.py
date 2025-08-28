from cv2 import (
    CAP_PROP_FRAME_WIDTH, CAP_PROP_FRAME_HEIGHT, CAP_PROP_FPS, CAP_PROP_FRAME_COUNT,
    VideoCapture, VideoWriter_fourcc, VideoWriter,
    rectangle, circle, line, getTextSize, putText, FONT_HERSHEY_SIMPLEX, LINE_AA
)
from numpy import array, dot, linalg
from ultralytics import YOLO
from os import path
from ast import literal_eval


def process_video(progress_dict: dict, file_id: str, options):
    line_start, line_end = (370, 125), (245, 100)

    show_line = options['counterLine']['enabled']
    line_color = literal_eval(options['counterLine']['color'][3:])
    threshold = options['counterLine']['threshold']
    show_threshold = options['counterLine']['showResponseZone']

    show_bb = options['objectFrame']['enabled']
    bb_color = literal_eval(options['objectFrame']['color'][3:])
    show_classname = options['objectFrame']['showClassName']
    show_confidence = options['objectFrame']['showClassProbability']
    show_center = options['objectFrame']['showCenter']

    text_color = literal_eval(options['textColor'][3:])

    fast_model = True if options['selectedModel'] == 'YOLOv8n' else False

    filepath = f'uploads/{file_id}.mp4'
    output_path = f'volume/{file_id}.mp4'


    model_name = 'weights/' + ('yolov8n.pt' if fast_model else 'yolov8s.pt')

    model = YOLO(model_name)
    cap = VideoCapture(filepath)

    frame_width = int(cap.get(CAP_PROP_FRAME_WIDTH))
    frame_height = int(cap.get(CAP_PROP_FRAME_HEIGHT))
    fps = int(cap.get(CAP_PROP_FPS))
    total_frames = int(cap.get(CAP_PROP_FRAME_COUNT))

    fourcc = VideoWriter_fourcc(*'mp4v')
    out = VideoWriter(output_path, fourcc, fps, (frame_width, frame_height))

    current_frame = 0

    line_vector = array(line_end) - array(line_start)
    line_normal = array([-line_vector[1], line_vector[0]])

    tracked_objects = {}
    in_count = out_count = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        results = model.track(frame, persist=True, verbose=False, conf=0.7)[0]

        if results.boxes is not None and results.boxes.id is not None:
            boxes = results.boxes.xyxy.cpu().numpy()
            track_ids = results.boxes.id.cpu().numpy().astype(int)
            confidences = results.boxes.conf.cpu().numpy()

            for box, track_id, confidence in zip(boxes, track_ids, confidences):
                x1, y1, x2, y2 = map(int, box)
                center = array([(x1 + x2) // 2, (y1 + y2) // 2])

                if show_bb:
                    rectangle(frame, (x1, y1), (x2, y2), bb_color, 2)

                    if show_center:
                        circle(frame, tuple(center), 3, (0, 0, 255), -1)

                    if show_classname or show_confidence:
                        classname = 'Bag' if show_classname else ''
                        confidence = f'{round(confidence * 100)}%' if show_confidence else ''

                        label = f'{classname} {confidence}'

                        (text_width, text_height), baseline = getTextSize(label, FONT_HERSHEY_SIMPLEX, 0.5, 2)

                        rectangle(frame, (x1, y1 - text_height - 10), (x1 + text_width, y1), bb_color, -1)
                        putText(frame, label, (x1, y1 - 5), FONT_HERSHEY_SIMPLEX, 0.5, text_color, 1, LINE_AA)

                to_center = center - array(line_start)
                distance = dot(to_center, line_normal)

                if distance < -threshold:
                    current_zone = -1
                elif distance > threshold:
                    current_zone = 1
                else:
                    current_zone = 0

                if track_id in tracked_objects:
                    prev_zone = tracked_objects[track_id]

                    if prev_zone == -1 and current_zone == 1:
                        in_count += 1
                        tracked_objects[track_id] = current_zone
                    
                    elif prev_zone == 1 and current_zone == -1:
                        out_count += 1
                        tracked_objects[track_id] = current_zone

                    elif current_zone != 0:
                        tracked_objects[track_id] = current_zone
                else:
                    if current_zone != 0:
                        tracked_objects[track_id] = current_zone

        if show_line:
            line(frame, line_start, line_end, line_color, 2)

            if show_threshold:
                line_direction = line_vector / linalg.norm(line_vector)
                perp_direction = array([-line_direction[1], line_direction[0]])

                p1_start = tuple((array(line_start) + perp_direction * threshold).astype(int))
                p1_end = tuple((array(line_end) + perp_direction * threshold).astype(int))
                p2_start = tuple((array(line_start) - perp_direction * threshold).astype(int))
                p2_end = tuple((array(line_end) - perp_direction * threshold).astype(int))

                line(frame, p1_start, p1_end, (0, 255, 0), 1)
                line(frame, p2_start, p2_end, (0, 255, 0), 1)

        putText(frame, f'{in_count - out_count}', (20, 40), FONT_HERSHEY_SIMPLEX, 1, text_color, 2, LINE_AA)

        out.write(frame)

        current_frame += 1
        progress_dict[file_id] = (current_frame / total_frames) * 100

    progress_dict[file_id] = 100
    cap.release()
    out.release()
